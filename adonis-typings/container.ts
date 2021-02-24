declare module '@ioc:Adonis/Core/Application' {
	import { CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
	import { SharableCacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-SharableCache'

	export interface ContainerBindings {
		'Adonis/Addons/Adonis5-Cache': CacheManagerContract
		'Adonis/Addons/Adonis5-SharableCache': SharableCacheManagerContract
	}
}
