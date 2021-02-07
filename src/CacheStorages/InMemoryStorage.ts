import {
	CacheContextContract,
	CacheStorageContract,
	TaggableStorageContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import dayjs from 'dayjs'
import { append } from 'ramda'

interface InMemoryRecord {
	recordExpirationTime: string
	recordValue: string
}

type InMemoryCacheCollection = {
	cacheRecords: { [key: string]: InMemoryRecord }
	tags: { [key: string]: string[] }
}

export default class InMemoryStorage implements CacheStorageContract, TaggableStorageContract {
	protected cacheStorage: InMemoryCacheCollection

	constructor() {
		this.cacheStorage = this.initCacheStorage
	}

	private get initCacheStorage(): InMemoryCacheCollection {
		return { cacheRecords: {}, tags: {} }
	}

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
		this.cacheStorage = this.initCacheStorage
	}

	public async forget(key: string): Promise<boolean> {
		const isExists = key in this.cacheStorage
		delete this.cacheStorage[key]

		return isExists
	}

	public async addTag(tag: string, tagData: string): Promise<void> {
		this.cacheStorage.tags[tag] = append(tagData, this.cacheStorage.tags[tag])
	}

	public async readTag(tag: string): Promise<string[]> {
		return this.cacheStorage.tags[tag] || []
	}

	public async removeTag(tag: string) {
		delete this.cacheStorage.tags[tag]
	}

	public resolveTtl(ttlInMl: number): number {
		return ttlInMl
	}
}
