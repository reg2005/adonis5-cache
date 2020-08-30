import Redis from '@ioc:Adonis/Addons/Redis'
import { CacheContextContract, CacheStorageContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

export default class RedisStorage implements CacheStorageContract {
	constructor(protected redisConnection: typeof Redis) {}

	public async get<T = any>(context: CacheContextContract, key: string): Promise<T | null> {
		const cacheValue = await this.redisConnection.get(key)
		return cacheValue !== null ? context.deserialize<T>(cacheValue) : cacheValue
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
		await this.redisConnection.psetex(key, ttl, context.serialize<T>(value))
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
}
