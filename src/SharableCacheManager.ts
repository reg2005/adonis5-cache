import { CacheManagerContract, ConstructorParams } from '@ioc:Adonis/Addons/Adonis5-Cache'
import TaggableCacheManager from './TaggableCacheManager'
import CacheManager from './CacheManager'
import {
	CacheCommand,
	SharableCacheManagerContract,
	SharableCacheTransportContract,
} from '@ioc:Adonis/Addons/Adonis5-SharableCache'

export default class SharableCacheManager
	extends CacheManager
	implements SharableCacheManagerContract {
	protected _transport: SharableCacheTransportContract
	protected commandQueue: CacheCommand[] = []
	protected interval: NodeJS.Timeout | null = null

	constructor({ config, eventEmitter }: ConstructorParams) {
		super({ config, eventEmitter })
	}

	public get sharedCacheConfig() {
		return this.cacheConfig.sharedCacheConfig
	}

	public get transport(): SharableCacheTransportContract {
		return this._transport
	}

	public set transport(value: SharableCacheTransportContract) {
		this._transport = value
	}

	public viaContext(contextName: string): CacheManagerContract {
		this.addCommandToQueue('viaContext', [contextName], true)
		return super.viaContext(contextName)
	}

	public viaStorage(storageName: string): CacheManagerContract {
		this.addCommandToQueue('viaStorage', [storageName], true)
		return super.viaStorage(storageName)
	}

	public tags(...tags: string[]): TaggableCacheManager {
		return new TaggableCacheManager(this, tags)
	}

	public enableStorage(storageName: string): CacheManagerContract {
		this.addCommandToQueue('enableStorage', [storageName], true)
		return super.enableStorage(storageName)
	}

	public enableContext(contextName: string): CacheManagerContract {
		this.addCommandToQueue('enableContext', [contextName], false)
		return super.enableContext(contextName)
	}

	public async put<T = any>(key: string, value: T, ttl?: number) {
		this.addCommandToQueue('put', [key, value, ttl], false)
		return super.put(key, value, ttl)
	}

	public async putMany<T = any>(cacheDictionary: Record<string, T>, ttl?: number) {
		this.addCommandToQueue('putMany', [cacheDictionary, ttl], false)
		return super.putMany(cacheDictionary, ttl)
	}

	public async flush(): Promise<void> {
		this.addCommandToQueue('flush', [], false)
		return super.flush()
	}

	public async forget(key: string): Promise<boolean> {
		this.addCommandToQueue('forget', [key], false)
		return super.forget(key)
	}

	public setTransport(transport: SharableCacheTransportContract) {
		this.transport = transport
		this.transport.subscribeForUpdates(this.onCacheUpdate.bind(this))
	}

	public addCommandToQueue(method: string, args: unknown[], isReturnThis: boolean): void {
		this.commandQueue.push({ method, args, isReturnThis, createdAt: new Date().toISOString() })
	}

	public runSynchronization() {
		this.transport.subscribeForUpdates(this.onCacheUpdate.bind(this))
		this.interval = setInterval(async () => {
			if (this.commandQueue.length !== 0) {
				this.transport.sync(this.commandQueue)
				this.commandQueue = []
			}
		}, this.cacheConfig?.sharedCacheConfig?.syncInterval || 0)
	}

	public stopSynchronization() {
		if (this.interval) {
			clearInterval(this.interval)
		}
	}

	public get isSharingEnabled(): boolean {
		return this.cacheConfig?.sharedCacheConfig?.isSharingEnabled || false
	}

	protected async onCacheUpdate(cacheCommands: CacheCommand[]): Promise<void> {
		let callResult: CacheManagerContract | null = null
		for (let { method, args, isReturnThis, createdAt } of cacheCommands) {
			if (method === 'put' || method === 'putMany') {
				const ttl = args[args.length - 1]
				const ttlInMs = this.timeConverter.toMS(parseFloat(ttl as string) || null)
				const fixedTtl = ttlInMs - (new Date(createdAt).getTime() - new Date().getTime())
				args = [
					...args.slice(0, args.length - 1),
					this.timeConverter.fromMs(fixedTtl, this.cacheConfig.ttlUnits),
				]
			}

			callResult = callResult ? callResult[method](...args) : super[method](...args)

			if (isReturnThis) {
				callResult = null
			}
		}
	}
}
