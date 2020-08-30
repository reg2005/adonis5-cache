declare module '@ioc:Adonis/Addons/Adonis5-Cache' {
	type CacheSerializer = <T = any>(value: T) => string
	type CacheDeserializer = <T = any>(value: string) => T

	export interface CacheContextContract {
		serialize: CacheSerializer

		deserialize: CacheDeserializer
	}

	export interface CacheStorageContract {
		get<T = any>(context: CacheContextContract, key: string): Promise<T | null>

		getMany<T = any>(context: CacheContextContract, keys: string[]): Promise<(T | null)[]>

		put<T = any>(context: CacheContextContract, key: string, value: T, ttl: number): Promise<void>

		putMany<T = any>(
			context: CacheContextContract,
			cacheDictionary: { [key: string]: T },
			ttl: number
		): Promise<void>

		flush(): Promise<void>

		forget(key: string): Promise<void>
	}

	export interface CacheManagerContract {
		recordTTL: number

		viaContext(contextName: string): CacheManagerContract

		viaStorage(storageName: string): CacheManagerContract

		enableStorage(storageName: string): CacheManagerContract

		enableContext(contextName: string): CacheManagerContract

		registerStorage(storageName: string, storage: CacheStorageContract): CacheManagerContract

		registerContext(contextName: string, storage: CacheContextContract): CacheManagerContract

		get<T = any>(key: string): Promise<T | null>

		getMany<T = any>(keys: string[]): Promise<(T | null)[]>

		put<T = any>(key: string, value: T, ttl?: number): Promise<void>

		putMany<T = any>(cacheDictionary: { [key: string]: T }, ttl?: number): Promise<void>

		flush(): Promise<void>

		forget(key: string): Promise<void>
	}

	type CacheStorage = 'redis' | 'in-memory' | string

	export interface CacheConfig {
		recordTTL: number
		currentCacheStorage: CacheStorage
		enabledCacheStorages: CacheStorage[]
		cacheKeyPrefix: string
	}

	const CacheManager: CacheManagerContract

	export default CacheManager
}
