import { IocContract } from '@adonisjs/fold/build'
import CacheManager from '../src/CacheManager'
import RedisStorage from '../src/CacheStorages/RedisStorage'
import InMemoryStorage from '../src/CacheStorages/InMemoryStorage'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { ConfigContract } from '@ioc:Adonis/Core/Config'
import {
	CacheConfig,
	CacheManagerContract,
	ConstructorParams,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { ApplicationContract, ContainerBindings } from '@ioc:Adonis/Core/Application'
import { AdonisMemcachedClientContract } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'
import MemcachedStorage from '../src/CacheStorages/MemcachedStorage'

export default abstract class BaseAdonisCacheProvider {
	public static needsApplication = true
	protected container: IocContract<ContainerBindings>

	abstract get providerAlias(): string

	abstract get cacheManagerClass(): new (args: ConstructorParams) => CacheManager

	constructor(protected application: ApplicationContract) {
		this.container = application.container
	}

	public register(): void {
		this.container.singleton(this.providerAlias, () => {
			const eventEmitter: EmitterContract = this.container.resolveBinding('Adonis/Core/Event')
			const config: ConfigContract = this.container.resolveBinding('Adonis/Core/Config')

			const CacheManagerClass = this.cacheManagerClass

			return new CacheManagerClass({
				eventEmitter,
				config: config.get('cache'),
			})
		})
	}

	public boot(): void {
		const cache: CacheManagerContract = this.container.resolveBinding(this.providerAlias)
		const cacheConfig: CacheConfig = this.container
			.resolveBinding('Adonis/Core/Config')
			.get('cache')

		if (cacheConfig.enabledCacheStorages.includes('redis')) {
			this.registerRedisCacheStorage(cache)
		}

		if (cacheConfig.enabledCacheStorages.includes('in-memory')) {
			this.registerInMemoryCacheStorage(cache)
		}

		if (cacheConfig.enabledCacheStorages.includes('memcached')) {
			this.registerMemcachedCacheStorage(cache)
		}
	}

	private registerRedisCacheStorage(cache: CacheManagerContract) {
		const redis: RedisManagerContract = this.container.resolveBinding('Adonis/Addons/Redis')
		cache.registerStorage('redis', new RedisStorage(redis))
	}

	private registerInMemoryCacheStorage(cache: CacheManagerContract) {
		cache.registerStorage('in-memory', new InMemoryStorage())
	}

	private registerMemcachedCacheStorage(cache: CacheManagerContract) {
		const memcachedClient: AdonisMemcachedClientContract = this.container.resolveBinding(
			'Adonis/Addons/Adonis5-MemcachedClient'
		)
		cache.registerStorage('memcached', new MemcachedStorage(memcachedClient))
	}
}
