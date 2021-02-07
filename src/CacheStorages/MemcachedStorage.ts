import {
	CacheContextContract,
	CacheStorageContract,
	TaggableStorageContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import { AdonisMemcachedClientContract } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'

export default class MemcachedStorage implements CacheStorageContract, TaggableStorageContract {
	constructor(protected memcachedClient: AdonisMemcachedClientContract) {}

	public async get<T = any>(context: CacheContextContract, key: string): Promise<T | null> {
		const cacheValue = (await this.memcachedClient.get<string>(key)) || null
		return cacheValue !== null ? context.deserialize<T>(cacheValue) : cacheValue
	}

	public async getMany<T = any>(
		context: CacheContextContract,
		keys: string[]
	): Promise<(T | null)[]> {
		const cachedValues = await this.memcachedClient.getMulti<string>(keys)

		return keys.map((key) => {
			return cachedValues[key] ? context.deserialize(cachedValues[key]) : null
		})
	}

	public async put<T = any>(
		context: CacheContextContract,
		key: string,
		value: T,
		ttl: number
	): Promise<void> {
		await this.memcachedClient.set(key, context.serialize<T>(value), ttl)
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
		await this.memcachedClient.flush()
	}

	public async forget(key: string): Promise<boolean> {
		const result = await this.memcachedClient.del(key)
		return Boolean(result)
	}

	public async addTag(tag: string, tagData: string): Promise<void> {
		const tagName = this.buildMemcachedTagName(tag)
		const tagRecords = (await this.memcachedClient.get<string[] | undefined>(tagName)) || []
		tagRecords.push(tagData)
		await this.memcachedClient.set(tagName, tagRecords, 0)
	}

	public async readTag(tag: string): Promise<string[]> {
		return (
			(await this.memcachedClient.get<string[] | undefined>(this.buildMemcachedTagName(tag))) || []
		)
	}

	public async removeTag(tag: string): Promise<void> {
		await this.memcachedClient.del(this.buildMemcachedTagName(tag))
	}

	protected buildMemcachedTagName(userTagName: string): string {
		return ['memcached-tag', userTagName].join(':')
	}

	public resolveTtl(ttlInMl: number): number {
		return Math.round(ttlInMl / 1000)
	}
}
