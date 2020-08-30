import test from 'japa'
import { AdonisApplication } from '../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../providers/AdonisCacheProvider'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'

import InMemoryStorage from '../src/CacheStorages/InMemoryStorage'
import { anything, instance, mock, verify } from 'ts-mockito'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'test-storage',
	enabledCacheStorages: [],
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

		verify(mockedStorage.putMany(anything(), testMap, cacheConfig.recordTTL)).once()
	}).timeout(0)

	test('should call put many operation on storage with custom TTL', async () => {
		const testMap = { a: 1 }
		const testTTL = 100
		const storageName = 'test-storage'
		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.putMany(testMap, testTTL)

		verify(mockedStorage.putMany(anything(), testMap, testTTL)).once()
	}).timeout(0)

	test('should call get many operation on storage', async () => {
		const testKeys = ['1', '2', '3']
		const storageName = 'test-storage'

		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)
		cacheManager.registerStorage(storageName, instance(mockedStorage)).enableStorage(storageName)

		await cacheManager.getMany(testKeys)

		verify(mockedStorage.getMany(anything(), testKeys)).once()
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
})
