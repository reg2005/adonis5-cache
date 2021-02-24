import test from 'japa'
import {
	CacheCommand,
	SharableCacheTransportContract,
} from '@ioc:Adonis/Addons/Adonis5-SharableCache'
import { CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import InMemoryStorage from '../../src/CacheStorages/InMemoryStorage'
import { anyNumber, anything, instance, mock, verify, when } from 'ts-mockito'
import { expect } from 'chai'
import SharableCacheManager from '../../src/SharableCacheManager'
const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'in-memory',
	enabledCacheStorages: [],
	cacheKeyPrefix: '',
	ttlUnits: 'ms',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
	sharedCacheConfig: {
		isSharingEnabled: true,
		syncInterval: 200,
	},
}

class TestTransport implements SharableCacheTransportContract {
	private handler: (commands: CacheCommand[]) => Promise<void>

	public subscribeForUpdates(handler: (commands: CacheCommand[]) => Promise<void>) {
		this.handler = handler
	}

	public sync(_cacheCommands: CacheCommand[]): void {}

	public async pushCommand(...commands: CacheCommand[]) {
		await this.handler(JSON.parse(JSON.stringify(commands)) as CacheCommand[])
	}
}

test.group('Adonis sharable cache provider - command-execution', () => {
	function initSharableCacheManager(config: CacheConfig) {
		const cacheManager = new SharableCacheManager({
			config,
			eventEmitter: {} as any,
		})

		const transport = new TestTransport()
		cacheManager.setTransport(transport)

		return { cacheManager, transport }
	}

	test('should call PUT operation on storage after receiving', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'

		const { cacheManager, transport } = initSharableCacheManager(cacheConfig)
		const mockedStorage = mock(InMemoryStorage)
		when(mockedStorage.resolveTtl(anyNumber())).thenReturn(cacheConfig.recordTTL)
		cacheManager.registerStorage('test-transport', instance(mockedStorage))
		cacheManager.enableStorage('test-transport')

		await transport.pushCommand({
			method: 'put',
			args: [testKey, testValue, undefined],
			isReturnThis: false,
			createdAt: new Date().toISOString(),
		})

		verify(mockedStorage.put(anything(), testKey, testValue, cacheConfig.recordTTL)).once()
	}).timeout(0)

	test('should call PUT operation with custom ttl params on storage after receiving', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const testTtl = 2500

		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const mockedStorage = mock(InMemoryStorage)
		when(mockedStorage.resolveTtl(anyNumber())).thenReturn(testTtl)
		cacheManager.registerStorage('test-storage', instance(mockedStorage))
		cacheManager.enableStorage('test-storage')

		await transport.pushCommand({
			method: 'put',
			args: [testKey, testValue, testTtl],
			isReturnThis: false,
			createdAt: new Date().toISOString(),
		})

		verify(mockedStorage.put(anything(), testKey, testValue, testTtl)).once()
	}).timeout(0)

	test('should call PUT MANY operation with custom ttl params on storage after receiving', async () => {
		const testMap = { a: 'value-a', b: 'value-b' }
		const testTtl = 2500

		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const mockedStorage = mock(InMemoryStorage)
		when(mockedStorage.resolveTtl(anyNumber())).thenReturn(testTtl)
		cacheManager.registerStorage('test-transport', instance(mockedStorage))
		cacheManager.enableStorage('test-transport')

		await transport.pushCommand({
			method: 'putMany',
			args: [testMap, testTtl],
			isReturnThis: false,
			createdAt: new Date().toISOString(),
		})

		const transformedTestMap = Object.entries(testMap).reduce((acc, [key, value]) => {
			return { ...acc, [cacheConfig.cacheKeyPrefix + key]: value }
		}, {})

		verify(mockedStorage.putMany(anything(), transformedTestMap, testTtl))
	}).timeout(0)

	test('should call FLUSH operation on storage after receiving', async () => {
		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const mockedStorage = mock(InMemoryStorage)
		cacheManager.registerStorage('test-transport', instance(mockedStorage))
		cacheManager.enableStorage('test-transport')

		await transport.pushCommand({
			method: 'flush',
			args: [],
			isReturnThis: false,
			createdAt: new Date().toISOString(),
		})

		verify(mockedStorage.flush()).once()
	}).timeout(0)

	test('should change manager context  after receiving command', async () => {
		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const testContextName = 'test-context'

		cacheManager.registerContext(testContextName, testContextName as any)
		cacheManager.enableContext(testContextName)

		await transport.pushCommand({
			method: 'viaContext',
			args: [testContextName],
			isReturnThis: true,
			createdAt: new Date().toISOString(),
		})

		expect(cacheManager.context).to.equal(testContextName)
	}).timeout(0)

	test('should change manager storage after receiving command', async () => {
		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const testStorageName = 'test-storage'

		cacheManager.registerStorage(testStorageName, testStorageName as any)
		cacheManager.enableStorage(testStorageName)

		await transport.pushCommand({
			method: 'viaStorage',
			args: [testStorageName],
			isReturnThis: true,
			createdAt: new Date().toISOString(),
		})

		expect(cacheManager.storage).to.equal(testStorageName)
	}).timeout(0)

	test('should change manager storage and put new value to new storage after receiving commands', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const { transport, cacheManager } = initSharableCacheManager(cacheConfig)
		const testStorageName = 'test-storage'
		const testTtl = 2500

		cacheManager.registerStorage('initialStorage', new InMemoryStorage())
		cacheManager.enableStorage('initialStorage')

		const mockedStorage = mock(InMemoryStorage)
		when(mockedStorage.resolveTtl(testTtl)).thenReturn(testTtl)
		cacheManager.registerStorage(testStorageName, instance(mockedStorage))

		await transport.pushCommand(
			{
				method: 'viaStorage',
				args: [testStorageName],
				isReturnThis: true,
				createdAt: new Date().toISOString(),
			},
			{
				method: 'put',
				args: [testKey, testValue, testTtl],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			}
		)

		verify(mockedStorage.put(anything(), testKey, testValue, testTtl)).once()
	}).timeout(0)
})
