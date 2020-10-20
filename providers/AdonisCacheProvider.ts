import { IocContract } from '@adonisjs/fold/build'
import CacheManager from '../src/CacheManager'
import RedisStorage from '../src/CacheStorages/RedisStorage'
import InMemoryStorage from '../src/CacheStorages/InMemoryStorage'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { ConfigContract } from '@ioc:Adonis/Core/Config'
import { CacheConfig, CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'

export default class AdonisCacheProvider {
	constructor(protected container: IocContract) {}

	public register(): void {
		this.container.singleton('Adonis/Addons/Adonis5-Cache', () => {
			const eventEmitter: EmitterContract = this.container.use('Adonis/Core/Event')
			const config: ConfigContract = this.container.use('Adonis/Core/Config')

			return new CacheManager({
				eventEmitter,
				config: config.get('cache'),
			})
		})
	}

	public boot(): void {
		const cache: CacheManagerContract = this.container.use('Adonis/Addons/Adonis5-Cache')
		const cacheConfig: CacheConfig = this.container.use('Adonis/Core/Config').get('cache')

		if (cacheConfig.enabledCacheStorages.includes('redis')) {
			const redis: RedisManagerContract = this.container.use('Adonis/Addons/Redis')
			cache.registerStorage('redis', new RedisStorage(redis))
		}

		if (cacheConfig.enabledCacheStorages.includes('in-memory')) {
			cache.registerStorage('in-memory', new InMemoryStorage())
		}
	}
}
