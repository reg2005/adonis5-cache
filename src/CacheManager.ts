import Redis from '@ioc:Adonis/Addons/Redis'
import RedisStorage from './CacheStorages/RedisStorage'
import DefaultCacheContext from './CacheContexts/DefaultCacheContext'
import { IocContract } from '@adonisjs/fold/build'
import {
	CacheConfig,
	CacheContextContract,
	CacheManagerContract,
	CacheStorageContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import InMemoryStorage from './CacheStorages/InMemoryStorage'

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

	constructor(iocContainer: IocContract) {
		this.cacheConfig = iocContainer.use('Adonis/Core/Config').get('cache')
		this.currentCacheStorageName = this.cacheConfig.currentCacheStorage

		this.initCacheStorages(iocContainer)
		this.initCacheContexts()
	}

	public get recordTTL(): number {
		return this.cacheConfig.recordTTL || CacheManager.DEFAULT_RECORD_TTL
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

	public async get<T = any>(key: string): Promise<T | null> {
		const operationResult = await this.storage.get(this.context, key)
		this.restoreState()
		return operationResult
	}

	public async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
		const operationResult = await this.storage.getMany(this.context, keys)
		this.restoreState()
		return operationResult
	}

	public async put<T = any>(key: string, value: T, ttl: number = this.recordTTL) {
		const operationResult = await this.storage.put(this.context, key, value, ttl)
		this.restoreState()
		return operationResult
	}

	public async putMany<T = any>(cacheDictionary: { [p: string]: T }, ttl: number = this.recordTTL) {
		const operationResult = await this.storage.putMany(this.context, cacheDictionary, ttl)
		this.restoreState()
		return operationResult
	}

	private restoreState() {
		this.tempStorageName = null
		this.tempContextName = null
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

	private initCacheContexts() {
		this.currentCacheContextName = 'DEFAULT'
		this.cacheContexts = { [this.currentCacheContextName]: DefaultCacheContext }
	}
}
