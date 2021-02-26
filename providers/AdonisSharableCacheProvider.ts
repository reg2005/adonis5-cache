import CacheManager from '../src/CacheManager'
import { CacheConfig, ConstructorParams } from '@ioc:Adonis/Addons/Adonis5-Cache'
import BaseAdonisCacheProvider from './BaseAdonisCacheProvider'
import SharableCacheManager from '../src/SharableCacheManager'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { RedisCacheDistributorTransport } from '../src/SharableCacheTransports/RedisCacheDistributorTransport'

export default class AdonisSharableCacheProvider extends BaseAdonisCacheProvider {
	public get providerAlias(): string {
		return 'Adonis/Addons/Adonis5-SharableCache'
	}

	public get cacheManagerClass(): { new (args: ConstructorParams): CacheManager } {
		return SharableCacheManager
	}

	public async boot() {
		await super.boot()

		const cache: SharableCacheManager = this.container.resolveBinding(this.providerAlias)

		const cacheConfig: CacheConfig = this.container
			.resolveBinding('Adonis/Core/Config')
			.get('cache')

		const redis: RedisManagerContract = this.container.resolveBinding('Adonis/Addons/Redis')
		cache.setTransport(new RedisCacheDistributorTransport(redis))

		if (cacheConfig.sharedCacheConfig?.isSharingEnabled) {
			cache.runSynchronization()
		}
	}
}
