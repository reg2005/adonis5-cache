import {
	AsyncFunction,
	TaggableStorageContract,
	TagPayloadContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'

export function isTaggableStorage(storage: object): storage is TaggableStorageContract {
	return 'addTag' in storage && 'readTag' in storage && 'removeTag' in storage
}

export function isTagPayloadContract(storage: object): storage is TagPayloadContract {
	return 'keys' in storage && 'expirationTime' in storage
}

export function isAsyncFunction(value: unknown): value is AsyncFunction {
	return typeof value === 'function'
}
