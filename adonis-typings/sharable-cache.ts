declare module '@ioc:Adonis/Addons/Adonis5-SharableCache' {
	import { CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

	export type CacheCommand = {
		method: string
		args: unknown[]
		isReturnThis: boolean
		createdAt: string
	}

	export interface SharableCacheManagerContract extends Omit<CacheManagerContract, 'tags'> {
		transport: SharableCacheTransportContract
		runSynchronization(): void
		stopSynchronization(): void
		addCommandToQueue(method: string, args: unknown[], isReturnThis: boolean): void
		isSharingEnabled: boolean
	}

	export interface SharableCacheTransportContract {
		sync(cacheCommands: CacheCommand[]): void
		subscribeForUpdates(handleCommands: (commands: CacheCommand[]) => Promise<void>): void
	}

	const SharableCacheManager: SharableCacheManagerContract

	export default SharableCacheManager
}
