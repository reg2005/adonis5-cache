import test from 'japa'
import { expect } from 'chai'
import { AdonisApplication } from '../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../providers/AdonisCacheProvider'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'

import InMemoryStorage from '../src/CacheStorages/InMemoryStorage'

const cacheConfig: CacheConfig = {
	recordTTL: 10000,
	currentCacheStorage: 'test-storage',
	enabledCacheStorages: [],
}

test.group('Adonis cache provider - test cache context API', (group) => {
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

	test('should add extra keys during serialization process to cache record using custom context', async () => {
		const testKey = 'testKey'
		const testValue = { b: 1 }
		const storageName = 'test-storage'
		const timestamp = Date.now()

		const customContext = {
			serialize: (obj: any) => JSON.stringify({ ...obj, serializedAt: timestamp }),
			deserialize: (cacheRecord: string) => JSON.parse(cacheRecord),
		}

		const inMemoryStorage: InMemoryStorage = new InMemoryStorage()
		cacheManager
			.registerStorage(storageName, inMemoryStorage)
			.enableStorage(storageName)
			.registerContext('test-context', customContext as any)
			.enableContext('test-context')

		await cacheManager.put(testKey, testValue)

		const expectedCacheValueRecord = { ...testValue, serializedAt: timestamp }

		expect(await cacheManager.get(testKey)).to.eql(expectedCacheValueRecord)
	}).timeout(0)

	test('should add extra keys during deserialization process using custom context', async () => {
		const testKey = 'testKey'
		const testValue = { b: 1 }
		const storageName = 'test-storage'
		const timestamp = Date.now()

		const customContext = {
			serialize: (obj: any) => JSON.stringify(obj),
			deserialize: (cacheRecord: string) => ({
				...JSON.parse(cacheRecord),
				deserializedAt: timestamp,
			}),
		}

		const inMemoryStorage: InMemoryStorage = new InMemoryStorage()
		cacheManager
			.registerStorage(storageName, inMemoryStorage)
			.enableStorage(storageName)
			.registerContext('test-context', customContext as any)
			.enableContext('test-context')

		await cacheManager.put(testKey, testValue)

		const expectedCacheValueRecord = { ...testValue, deserializedAt: timestamp }

		expect(await cacheManager.get(testKey)).to.eql(expectedCacheValueRecord)
	}).timeout(0)
})
