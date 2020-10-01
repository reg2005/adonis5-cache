import Redis from '@ioc:Adonis/Addons/Redis'
import RedisStorage from './CacheStorages/RedisStorage'
import DefaultCacheContext from './CacheContexts/DefaultCacheContext'
import { IocContract } from '@adonisjs/fold/build'
import {
	CacheConfig,
	CacheContextContract,
	CacheManagerContract,
	CacheStorageContract,
	AsyncFunction,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import InMemoryStorage from './CacheStorages/InMemoryStorage'
import CacheEventEmitter from './CacheEventEmitter'
import { zipObj, isNil } from 'ramda'
import TaggableCacheManager from './TaggableCacheManager'
import { isAsyncFunction } from './TypeGuards'
import ms from 'ms'

export enum RegisteredCacheStorages {
	REDIS = 'redis',
	IN_MEMORY = 'in-memory',
}

export type CacheStorageCollection = { [key: string]: CacheStorageContract }
export type CacheContextCollection = { [key: string]: CacheContextContract }

export default class CacheManager implements CacheManagerContract {
	public static readonly DEFAULT_RECORD_TTL = 6000

	protected cacheStorages: CacheStorageCollection = {}
	protected cacheContexts: CacheContextCollection = {}
	protected cacheConfig: CacheConfig

	protected currentCacheStorageName: string
	protected currentCacheContextName: string

	protected tempContextName: string | null = null
	protected tempStorageName: string | null = null
	protected eventEmitter: CacheEventEmitter
	protected cacheTags: string[] = []

	constructor(iocContainer: IocContract) {
		this.cacheConfig = iocContainer.use('Adonis/Core/Config').get('cache')
		this.eventEmitter = new CacheEventEmitter(
			this.cacheConfig.enabledEvents,
			iocContainer.use('Adonis/Core/Event')
		)
		this.currentCacheStorageName = this.cacheConfig.currentCacheStorage

		this.initCacheStorages(iocContainer)
		this.initCacheContexts()
	}

	public get recordTTL(): number {
		return this.cacheConfig.recordTTL || CacheManager.DEFAULT_RECORD_TTL
	}

	public get recordKeyPrefix(): string {
		return this.cacheConfig.cacheKeyPrefix
	}

	public get context(): CacheContextContract {
		return this.tempContextName
			? this.cacheContexts[this.tempContextName]
			: this.cacheContexts[this.currentCacheContextName]
	}

	public get storage(): CacheStorageContract {
		return this.tempStorageName !== null
			? this.cacheStorages[this.tempStorageName]
			: this.cacheStorages[this.currentCacheStorageName]
	}

	public registerStorage(storageName: string, storage: CacheStorageContract): CacheManagerContract {
		this.cacheStorages[storageName] = storage
		return this
	}

	public registerContext(contextName: string, context: CacheContextContract): CacheManagerContract {
		this.cacheContexts[contextName] = context
		return this
	}

	public viaContext(contextName: string): CacheManagerContract {
		if (!this.cacheContexts.hasOwnProperty(contextName)) {
			throw new Error('Unregistered context for Adonis-Cache')
		}
		this.tempContextName = contextName

		return this
	}

	public viaStorage(storageName: string): CacheManagerContract {
		if (!this.cacheStorages.hasOwnProperty(storageName)) {
			throw new Error('Unregistered storage for Adonis-Cache')
		}
		this.tempStorageName = storageName

		return this
	}

	public tags(...tags: string[]): TaggableCacheManager {
		return new TaggableCacheManager(this, tags)
	}

	public enableStorage(storageName: string): CacheManagerContract {
		if (!this.cacheStorages.hasOwnProperty(storageName)) {
			throw new Error('Unregistered storage for Adonis-Cache')
		}
		this.currentCacheStorageName = storageName

		return this
	}

	public enableContext(contextName: string): CacheManagerContract {
		if (!this.cacheContexts.hasOwnProperty(contextName)) {
			throw new Error('Unregistered context for Adonis-Cache')
		}
		this.currentCacheContextName = contextName

		return this
	}

	public async get<T = any>(key: string, fallback?: T | AsyncFunction<T>): Promise<T | null> {
		const cacheValue = await this.storage.get<T>(this.context, this.buildRecordKey(key))
		this.emitEventsOnReadOperations({ [key]: cacheValue })
		this.restoreState()

		return this.resolveFallback(cacheValue, fallback || null)
	}

	public async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
		const cachedValues = await this.storage.getMany<T>(
			this.context,
			keys.map((key) => this.buildRecordKey(key))
		)
		this.emitEventsOnReadOperations(zipObj(keys, cachedValues))
		this.restoreState()
		return cachedValues
	}

	public async put<T = any>(key: string, value: T, ttl?: number) {
		const operationResult = await this.storage.put(
			this.context,
			this.buildRecordKey(key),
			value,
			this.resolveCacheTTL(ttl)
		)
		this.eventEmitter.emitEvent('cache-record:written', { [key]: value })
		this.restoreState()
		return operationResult
	}

	public async putMany<T = any>(cacheDictionary: { [p: string]: T }, ttl?: number) {
		const operationResult = await this.storage.putMany(
			this.context,
			Object.entries(cacheDictionary).reduce((acc, [key, value]) => {
				return { ...acc, [this.buildRecordKey(key)]: value }
			}, {}),
			this.resolveCacheTTL(ttl)
		)
		this.eventEmitter.emitEvent('cache-record:written', cacheDictionary)
		this.restoreState()
		return operationResult
	}

	public async flush(): Promise<void> {
		await this.storage.flush()
	}

	public async forget(key: string): Promise<boolean> {
		const result = await this.storage.forget(this.buildRecordKey(key))
		this.eventEmitter.emitEvent('cache-record:forgotten', { [key]: result })
		return result
	}

	private buildRecordKey(userKey: string): string {
		return this.recordKeyPrefix + userKey
	}

	private restoreState() {
		this.tempStorageName = null
		this.tempContextName = null
		this.cacheTags = []
	}

	private initCacheStorages(iocContainer: IocContract) {
		if (this.cacheConfig.enabledCacheStorages.includes(RegisteredCacheStorages.REDIS)) {
			const redis: typeof Redis = iocContainer.use('Adonis/Addons/Redis')
			this.registerStorage(RegisteredCacheStorages.REDIS, new RedisStorage(redis))
		}

		if (this.cacheConfig.enabledCacheStorages.includes(RegisteredCacheStorages.IN_MEMORY)) {
			this.registerStorage(RegisteredCacheStorages.IN_MEMORY, new InMemoryStorage())
		}
	}

	private emitEventsOnReadOperations<T = null>(cacheData: { [key: string]: T }) {
		const missedKeys: string[] = []
		const storedData = {}
		for (const [key, value] of Object.entries(cacheData)) {
			value === null ? missedKeys.push(key) : Object.assign(storedData, { [key]: value })
		}
		if (missedKeys.length > 0) {
			this.eventEmitter.emitEvent('cache-record:missed', { keys: missedKeys })
		}

		if (Object.keys(storedData).length > 0) {
			this.eventEmitter.emitEvent('cache-record:read', storedData)
		}
	}

	private initCacheContexts() {
		this.currentCacheContextName = 'DEFAULT'
		this.cacheContexts = { [this.currentCacheContextName]: DefaultCacheContext }
	}

	private resolveFallback<T = any>(value: T | null, fallback: T | AsyncFunction<T>): Promise<T> {
		if (!isNil(value)) {
			return Promise.resolve(value)
		}

		if (isAsyncFunction(fallback)) {
			return fallback()
		}

		return Promise.resolve(fallback)
	}

	private resolveCacheTTL(ttl: number | undefined): number {
		return Number(ms((ttl || this.recordTTL) + this.cacheConfig.ttlUnits))
	}
}
