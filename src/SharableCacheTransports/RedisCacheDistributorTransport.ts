import { v4 as uuid } from 'uuid'
import {
	CacheCommand,
	SharableCacheTransportContract,
} from '@ioc:Adonis/Addons/Adonis5-SharableCache'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'

type RedisCacheCommandPayload = {
	sender: string
	data: CacheCommand[]
}

export class RedisCacheDistributorTransport implements SharableCacheTransportContract {
	private readonly clientId: string
	public static readonly SYNC_CHANNEL_NAME: string = 'REDIS_CACHE_SYNC_CHANNEL'

	constructor(protected readonly redisConnection: RedisManagerContract) {
		this.clientId = uuid()
	}

	public async sync(cacheCommands: CacheCommand[]): Promise<void> {
		await this.redisConnection.publish(
			RedisCacheDistributorTransport.SYNC_CHANNEL_NAME,
			JSON.stringify({ sender: this.clientId, data: cacheCommands })
		)
	}

	public subscribeForUpdates(handleCommands: (commands: CacheCommand[]) => Promise<void>) {
		this.redisConnection.subscribe(
			RedisCacheDistributorTransport.SYNC_CHANNEL_NAME,
			async (payload: string) => {
				const { data, sender } = JSON.parse(payload) as RedisCacheCommandPayload
				if (sender !== this.clientId) {
					await handleCommands(data)
				}
			}
		)
	}
}
