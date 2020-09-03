import { CacheContextContract, CacheStorageContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
import dayjs from 'dayjs'

interface InMemoryRecord {
	recordExpirationTime: string
	recordValue: string
}

type InMemoryCollection = { [key: string]: InMemoryRecord }

export default class InMemoryStorage implements CacheStorageContract {
	protected cacheStorage: InMemoryCollection = {}

	constructor() {}

	public async get<T = any>(context: CacheContextContract, key: string): Promise<T | null> {
		const { recordExpirationTime, recordValue = null } = this.cacheStorage[key] || {}

		return recordValue !== null && dayjs().isBefore(dayjs(recordExpirationTime))
			? context.deserialize(recordValue)
			: null
	}

	public async getMany<T = any>(
		context: CacheContextContract,
		keys: string[]
	): Promise<(T | null)[]> {
		return Promise.all(keys.map((key) => this.get(context, key)))
	}

	public async put<T = any>(
		context: CacheContextContract,
		key: string,
		value: T,
		ttl: number
	): Promise<void> {
		this.cacheStorage[key] = {
			recordExpirationTime: dayjs().add(ttl, 'ms').toISOString(),
			recordValue: context.serialize(value),
		}
	}

	public async putMany<T = any>(
		context: CacheContextContract,
		cacheDictionary: { [p: string]: T },
		ttl: number
	): Promise<void> {
		await Promise.all(
			Object.entries(cacheDictionary).map(([key, value]) => this.put<T>(context, key, value, ttl))
		)
	}

	public async flush(): Promise<void> {
		this.cacheStorage = {}
	}

	public async forget(key: string): Promise<boolean> {
		const isExists = key in this.cacheStorage
		delete this.cacheStorage[key]

		return isExists
	}
}
