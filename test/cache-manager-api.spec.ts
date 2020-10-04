import test from 'japa'
import { AdonisApplication } from '../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../providers/AdonisCacheProvider'
import {
	CacheManagerContract,
	CacheConfig,
	TaggableCacheManagerContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'

import InMemoryStorage from '../src/CacheStorages/InMemoryStorage'
import { anything, instance, mock, objectContaining, verify, when } from 'ts-mockito'
import { expect } from 'chai'
import Config from '@ioc:Adonis/Core/Config'
import TaggableCacheManager from '../src/TaggableCacheManager'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'test-storage',
	enabledCacheStorages: [],
	cacheKeyPrefix: '',
	ttlUnits: 'ms',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
}

test.group('Adonis cache provider - test cache manager API', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(AdonisCacheProvider)
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-Cache')
	})

	test('should get value from default cache storage', async () => {
		const testKey = 'testKey'
		const storageName = 'mocked-in-memory-store'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage))
		cacheManager.enableStorage(storageName)

		await cacheManager.get(testKey)

		verify(mockedStorage.get(anything(), testKey)).once()
	}).timeout(0)

	test("should return fallback value, if cached value doesn't exists", async () => {
		const testKey = 'testKey'
		const fallbackValue = 'fallback-value'
		const storageName = 'mocked-in-memory-store'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		when(mockedStorage.get(anything(), testKey)).thenReturn(Promise.resolve(null))

		cacheManager.registerStorage(storageName, instance(mockedStorage))
		cacheManager.enableStorage(storageName)

		const receivedValue = await cacheManager.get(testKey, fallbackValue)

		expect(receivedValue).to.equal(fallbackValue)
		verify(mockedStorage.put(anything(), testKey, fallbackValue, cacheConfig.recordTTL)).once()
	}).timeout(0)

	test("should return results of fallback func, if cached value doesn't exists", async () => {
		const testKey = 'testKey'
		const fallbackValue = 'fallback-value'
		const storageName = 'mocked-in-memory-store'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		when(mockedStorage.get(anything(), testKey)).thenReturn(Promise.resolve(null))

		cacheManager.registerStorage(storageName, instance(mockedStorage))
		cacheManager.enableStorage(storageName)

		const receivedValue = await cacheManager.get(testKey, () => fallbackValue)

		expect(receivedValue).to.equal(fallbackValue)
		verify(mockedStorage.put(anything(), testKey, fallbackValue, cacheConfig.recordTTL)).once()
	}).timeout(0)

	test('should save fallback value to cache with custom ttl', async () => {
		const testKey = 'testKey'
		const fallbackValue = 'fallback-value'
		const storageName = 'mocked-in-memory-store'
		const ttl = 2000

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		when(mockedStorage.get(anything(), testKey)).thenReturn(Promise.resolve(null))

		cacheManager.registerStorage(storageName, instance(mockedStorage))
		cacheManager.enableStorage(storageName)

		const receivedValue = await cacheManager.get(testKey, fallbackValue, ttl)

		expect(receivedValue).to.equal(fallbackValue)
		verify(mockedStorage.put(anything(), testKey, fallbackValue, ttl)).once()
	}).timeout(0)

	test('should save async function fallback result to cache with custom ttl', async () => {
		const testKey = 'testKey'
		const fallbackValue = 'fallback-value'
		const storageName = 'mocked-in-memory-store'
		const ttl = 2000

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		when(mockedStorage.get(anything(), testKey)).thenReturn(Promise.resolve(null))

		cacheManager.registerStorage(storageName, instance(mockedStorage))
		cacheManager.enableStorage(storageName)

		const receivedValue = await cacheManager.get(testKey, () => fallbackValue, ttl)

		expect(receivedValue).to.equal(fallbackValue)
		verify(mockedStorage.put(anything(), testKey, fallbackValue, ttl)).once()
	}).timeout(0)

	test('should get value from selected cache storage', async () => {
		const testKey = 'testKey'
		const storageName = 'mocked-in-memory-store'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager
			.registerStorage(storageName, instance(mockedStorage))
			.registerStorage('default-storage', {} as any)
			.enableStorage('default-storage')

		await cacheManager.viaStorage(storageName).get(testKey)

		verify(mockedStorage.get(anything(), testKey)).once()
	}).timeout(0)

	test('should return value from correct storage after several storage toggling', async () => {
		const testKey = 'testKey'
		const storageName = 'mocked-in-memory-store'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager
			.registerStorage(storageName, instance(mockedStorage))
			.registerStorage('default-storage', {} as any)
			.enableStorage(storageName)
			.enableStorage('default-storage')
			.enableStorage(storageName)

		await cacheManager.get(testKey)

		verify(mockedStorage.get(anything(), testKey)).once()
	}).timeout(0)

	test('should return value from storage using selected context', async () => {
		const testKey = 'testKey'
		const storageName = 'mocked-in-memory-store'
		const fakeContext = 'fake-context'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager
			.registerStorage(storageName, instance(mockedStorage))
			.registerContext(fakeContext, fakeContext as any)

		await cacheManager.viaContext(fakeContext).get(testKey)

		verify(mockedStorage.get(fakeContext as any, testKey)).once()
	}).timeout(0)

	test('should set context as default context', async () => {
		const testKey = 'testKey'
		const storageName = 'mocked-in-memory-store'
		const fakeContext = 'fake-context'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager
			.registerStorage(storageName, instance(mockedStorage))
			.registerContext(fakeContext, fakeContext as any)
			.enableContext(fakeContext)

		await cacheManager.get(testKey)

		verify(mockedStorage.get(fakeContext as any, testKey)).once()
	}).timeout(0)

	test('should call put operation on storage with custom TTL', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const testTTL = 1000
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.put(testKey, testValue, testTTL)

		verify(mockedStorage.put(anything(), testKey, testValue, testTTL)).once()
	}).timeout(0)

	test('should call put operation on storage with default TTL', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.put(testKey, testValue)

		verify(mockedStorage.put(anything(), testKey, testValue, cacheConfig.recordTTL)).once()
	}).timeout(0)

	test('should call put many operation on storage with default TTL', async () => {
		const testMap = { a: 1 }
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.putMany(testMap)

		verify(
			mockedStorage.putMany(anything(), objectContaining(testMap), cacheConfig.recordTTL)
		).once()
	}).timeout(0)

	test('should call put many operation on storage with custom TTL', async () => {
		const testMap = { a: 1 }
		const testTTL = 100
		const storageName = 'test-storage'
		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.putMany(testMap, testTTL)

		verify(mockedStorage.putMany(anything(), objectContaining(testMap), testTTL)).once()
	}).timeout(0)

	test('should call get many operation on storage', async () => {
		const testKeys = ['1', '2', '3']
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		when(mockedStorage.getMany(anything(), objectContaining(testKeys))).thenReturn(
			Promise.resolve(testKeys)
		)

		await cacheManager.getMany(testKeys)

		verify(mockedStorage.getMany(anything(), objectContaining(testKeys))).once()
	}).timeout(0)

	test('should call forget operation on storage', async () => {
		const testKey = 'testKey'
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.forget(testKey)

		verify(mockedStorage.forget(testKey)).once()
	}).timeout(0)

	test('should call flush operation on storage', async () => {
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.flush()

		verify(mockedStorage.flush()).once()
	}).timeout(0)

	test('should add prefix to user key for storage during PUT OPERATION', async () => {
		const storageName = 'mocked-in-memory-store'
		const testKey = 'testKey'
		const testValue = 'testValue'
		const cacheKeyPrefix = 'cachePrefix'

		const config: typeof Config = adonisApp.iocContainer.use('Adonis/Core/Config')

		config.set('cache.cacheKeyPrefix', cacheKeyPrefix)

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.put(testKey, testValue, cacheConfig.recordTTL)

		verify(
			mockedStorage.put(anything(), cacheKeyPrefix + testKey, testValue, cacheConfig.recordTTL)
		).once()
	}).timeout(0)

	test('should add prefix to user key for storage during GET operation', async () => {
		const storageName = 'mocked-in-memory-store'
		const testKey = 'testKey'
		const cacheKeyPrefix = 'cachePrefix'

		const config: typeof Config = adonisApp.iocContainer.use('Adonis/Core/Config')

		config.set('cache.cacheKeyPrefix', cacheKeyPrefix)

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.get(testKey)

		verify(mockedStorage.get(anything(), cacheKeyPrefix + testKey)).once()
	}).timeout(0)

	test('should add prefix to user key for storage during PUT MANY operation', async () => {
		const storageName = 'mocked-in-memory-store'
		const testMap = { a: 1 }
		const cacheKeyPrefix = 'cachePrefix'
		const expectedMapWithPrefixes = { [cacheKeyPrefix + 'a']: testMap.a }

		const config: typeof Config = adonisApp.iocContainer.use('Adonis/Core/Config')

		config.set('cache.cacheKeyPrefix', cacheKeyPrefix)

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.putMany(testMap)

		verify(
			mockedStorage.putMany(
				anything(),
				objectContaining(expectedMapWithPrefixes),
				cacheConfig.recordTTL
			)
		).once()
	}).timeout(0)

	test('should add prefix to user key for storage during GET MANY operation', async () => {
		const storageName = 'mocked-in-memory-store'
		const testKeys = ['key1', 'key2']
		const cacheKeyPrefix = 'cachePrefix'
		const expectedKeysWithPrefixes = testKeys.map((key) => cacheKeyPrefix + key)

		const config: typeof Config = adonisApp.iocContainer.use('Adonis/Core/Config')

		config.set('cache.cacheKeyPrefix', cacheKeyPrefix)

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		when(mockedStorage.getMany(anything(), objectContaining(expectedKeysWithPrefixes))).thenReturn(
			Promise.resolve(testKeys)
		)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.getMany(testKeys)

		verify(mockedStorage.getMany(anything(), objectContaining(expectedKeysWithPrefixes))).once()
	}).timeout(0)

	test('should add prefix to user key for storage during FORGET operation', async () => {
		const storageName = 'mocked-in-memory-store'
		const testKey = 'testKey'
		const cacheKeyPrefix = 'cachePrefix'

		const config: typeof Config = adonisApp.iocContainer.use('Adonis/Core/Config')

		config.set('cache.cacheKeyPrefix', cacheKeyPrefix)

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.forget(testKey)

		verify(mockedStorage.forget(cacheKeyPrefix + testKey)).once()
	}).timeout(0)

	test('should return taggable cache manager for using taggable cache', async () => {
		const tags = ['testKey', 'testKey2']

		const taggableCacheManager: TaggableCacheManagerContract = await cacheManager.tags(...tags)

		expect(taggableCacheManager).instanceOf(TaggableCacheManager)
		expect(taggableCacheManager.tags).to.eql(tags)
	}).timeout(0)
})
