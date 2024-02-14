import {
	CacheManagerContract,
	TaggableCacheManagerContract,
	TaggableStorageContract,
	TagPayloadContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import dayjs from 'dayjs'
import { flatten } from 'ramda'

import { isTaggableStorage, isTagPayloadContract } from './TypeGuards'

export default class TaggableCacheManager implements TaggableCacheManagerContract {
	protected storage: TaggableStorageContract

	constructor(protected cacheManager: CacheManagerContract, protected _tags: string[]) {
		if (isTaggableStorage(cacheManager.storage)) {
			this.storage = cacheManager.storage
		}
	}

	public get tags(): string[] {
		return this._tags
	}

	public set tags(value: string[]) {
		this._tags = value
	}

	public async flush(): Promise<void> {
		const tagsPayload: string[][] = await Promise.all(
			this._tags.map((tag) => this.storage.readTag(this.buildTagKey(tag)))
		)

		const keyForRemove = flatten(tagsPayload).reduce((acc: string[], tagContent: string) => {
			const obj = JSON.parse(tagContent) as TagPayloadContract
			if (isTagPayloadContract(obj) && dayjs().isBefore(dayjs(obj.expirationTime))) {
				acc.push(...obj.keys)
			}

			return acc
		}, [])

		await Promise.all(keyForRemove.map((key) => this.cacheManager.forget(key)))
		await Promise.all(this._tags.map((tag) => this.storage.removeTag(this.buildTagKey(tag))))
	}

	public async put<T = any>(key: string, value: T, ttl?: number): Promise<void> {
		await this.saveTaggedKeys([key], ttl)
		return this.cacheManager.put(key, value, ttl)
	}

	public async putMany<T = any>(cacheDictionary: { [p: string]: T }, ttl?: number): Promise<void> {
		await this.saveTaggedKeys(Object.keys(cacheDictionary), ttl)
		return this.cacheManager.putMany(cacheDictionary, ttl)
	}

	protected async saveTaggedKeys(keys: string[], ttl: number = this.cacheManager.recordTTL) {
		const tagPayload = JSON.stringify({
			expirationTime: dayjs().add(ttl, this.cacheManager.cacheConfig.ttlUnits).toISOString(),
			keys,
		})
		await Promise.all(
			this._tags.map((tag) => this.storage.addTag(this.buildTagKey(tag), tagPayload))
		)
	}

	protected buildTagKey(tag: string): string {
		return `tag_${tag}`
	}
}
