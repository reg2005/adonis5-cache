declare module '@ioc:Adonis/Addons/Adonis5-Cache' {
	import { CacheStorage } from '@ioc:Adonis/Addons/Adonis5-Cache'

	export type CacheKeysEventPayload = { keys: string[] }
	export type CacheDataEventPayload = { [key: string]: unknown }
	export type CacheForgottenEventPayload = { [key: string]: boolean }

	export type EventPayload =
		| CacheDataEventPayload
		| CacheKeysEventPayload
		| CacheForgottenEventPayload

	export interface CacheEvents {
		'cache-record:read': CacheDataEventPayload

		'cache-record:written': CacheDataEventPayload

		'cache-record:missed': CacheKeysEventPayload

		'cache-record:forgotten': CacheForgottenEventPayload
	}

	export type CacheEventsConfig = Record<keyof CacheEvents, boolean>

	export interface CacheConfig {
		recordTTL: number
		currentCacheStorage: CacheStorage
		enabledCacheStorages: CacheStorage[]
		cacheKeyPrefix: string

		enabledEvents: CacheEventsConfig
	}
}

declare module '@ioc:Adonis/Core/Event' {
	import {
		CacheDataEventPayload,
		CacheKeysEventPayload,
		CacheForgottenEventPayload,
	} from '@ioc:Adonis/Addons/Adonis5-Cache'

	export interface EventsList {
		'cache-record:read': CacheDataEventPayload

		'cache-record:written': CacheDataEventPayload

		'cache-record:missed': CacheKeysEventPayload

		'cache-record:forgotten': CacheForgottenEventPayload
	}
}
