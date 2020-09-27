import { CacheEvents, CacheEventsConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { EmitterContract, EventsList } from '@ioc:Adonis/Core/Event'

export default class CacheEventEmitter {
	constructor(protected config: CacheEventsConfig, protected eventEmitter: EmitterContract) {}

	public emitEvent<K extends keyof CacheEvents>(eventType: K, payload: EventsList[K]) {
		if (this.config[eventType]) {
			this.eventEmitter.emit(eventType, payload)
		}
	}
}
