import Redis from '@ioc:Adonis/Addons/Redis'
import {
	CacheContextContract,
	CacheStorageContract,
	TaggableStorageContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'

export default class RedisStorage implements CacheStorageContract, TaggableStorageContract {
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

	public async flush(): Promise<void> {
		await this.redisConnection.flushdb()
	}

	public async forget(key: string): Promise<boolean> {
		const result = await this.redisConnection.del(key)
		return Boolean(result)
	}

	public async addTag(tag: string, tagData: string): Promise<void> {
		await this.redisConnection.sadd(tag, tagData)
	}

	public async readTag(tag: string): Promise<string[]> {
		return this.redisConnection.smembers(tag)
	}

	public async removeTag(tag: string): Promise<void> {
		await this.redisConnection.del(tag)
	}

	public resolveTtl(ttlInMl: number): number {
		return ttlInMl
	}
}
