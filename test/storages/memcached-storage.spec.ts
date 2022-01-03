import test from 'japa'
import { expect } from 'chai'
import AdonisApplication from 'adonis-provider-tester'
import AdonisCacheProvider from '../../providers/AdonisCacheProvider'
import memcachedClientProvider from 'adonis5-memcached-client/build/providers/AdonisMemcachedClientProvider'
import memcachedConfig from '../fixtures/memcached-test-config'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { AdonisMemcachedClientContract } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'
import { sleep } from '../test-utils/sleep'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'memcached',
	enabledCacheStorages: ['memcached'],
	cacheKeyPrefix: '',
	ttlUnits: 'ms',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
}

test.group('Adonis cache provider with memcachedClient driver', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let memcachedClient: AdonisMemcachedClientContract

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(memcachedClientProvider)
			.registerProvider(AdonisCacheProvider)
			.registerAppConfig({ configName: 'memcached', appConfig: memcachedConfig })
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-Cache')
		memcachedClient = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-MemcachedClient')
	})

	group.beforeEach(async () => {
		await memcachedClient.flush()
	})

	test('PUT operation - should save test value to memcachedClient storage with default record ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)
		const savedValue = await memcachedClient.get(testKey)
		expect(JSON.parse(savedValue as string)).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized number to storage', async () => {
		const testKey = 'test'
		const testValue = 1

		await cacheManager.put(testKey, testValue)
		const savedValue = await memcachedClient.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized boolean to storage', async () => {
		const testKey = 'test'
		const testValue = true

		await cacheManager.put(testKey, testValue)
		const savedValue = await memcachedClient.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized array to storage', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await cacheManager.put(testKey, testValue)
		const savedValue = await memcachedClient.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized object to storage', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '1', c: false }

		await cacheManager.put(testKey, testValue)
		const savedValue = await memcachedClient.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save test value to memcachedClient storage with specific ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 1000)
		const savedValue = await memcachedClient.get(testKey)

		expect(JSON.parse(savedValue as string)).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should return undefined value, record ttl are over', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 1000)
		await sleep(1500)

		const savedValue = await memcachedClient.get(testKey)
		expect(savedValue).to.be.undefined
	}).timeout(0)

	test('PUT MANY operation - should save several values to memcachedClient storage with default record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await memcachedClient.get(testKey)
			expect(JSON.parse(savedValue as string)).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should save several values memcachedClient storage with specific record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 1000)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await memcachedClient.get(testKey)
			expect(JSON.parse(savedValue as string)).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should return undefined values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 1000)
		await sleep(1500)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await memcachedClient.get(testKey)
			expect(savedValue).to.be.undefined
		}
	}).timeout(0)

	test('PUT MANY operation - should return undefined values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 1000)
		await sleep(1500)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await memcachedClient.get(testKey)
			expect(savedValue).to.be.undefined
		}
	}).timeout(0)

	test('GET operation - should return null, record with such key does not exits', async () => {
		const readedValue = await cacheManager.get('fake-key')
		expect(readedValue).to.be.null
	}).timeout(0)

	test('GET operation - should return stored value', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await memcachedClient.set(testKey, JSON.stringify(testValue), 5)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.equal(testValue)
	}).timeout(0)

	test('GET operation - should return stored array', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await memcachedClient.set(testKey, JSON.stringify(testValue), 5)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET operation - should return stored object', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '2', c: false }

		await memcachedClient.set(testKey, JSON.stringify(testValue), 5)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET MANY operation - should return null values, records do not exist', async () => {
		const readedValue = await cacheManager.getMany(['fake-key'])
		expect(readedValue).to.be.eql([null])
	}).timeout(0)

	test('GET MANY operation - should return stored values', async () => {
		const testMap = { test1: '1', test2: 2 }
		await Promise.all(
			Object.entries(testMap).map(([key, value]) => {
				return memcachedClient.set(key, JSON.stringify(value), 5)
			})
		)

		const readedValue = await cacheManager.getMany(Object.keys(testMap))
		expect(readedValue).to.be.eql(Object.values(testMap))
	}).timeout(0)

	test('FORGET operation - should remove cached value', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)

		const result = await cacheManager.forget(testKey)
		expect(result).to.be.true

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.null
	}).timeout(0)

	test("FORGET operation - should return false as operation result, record doesn't exist", async () => {
		const testKey = 'testKey'

		const result = await cacheManager.forget(testKey)

		expect(result).to.be.false
	}).timeout(0)

	test('FLUSH operation - should clean cache storage', async () => {
		const testKey1 = 'test-key-1'
		const testKey2 = 'test-key-'
		const testValue = 'testValue'

		await cacheManager.put(testKey1, testValue)
		await cacheManager.put(testKey2, testValue)

		await cacheManager.flush()

		expect(await memcachedClient.get(testKey1)).to.be.undefined
		expect(await memcachedClient.get(testKey2)).to.be.undefined
	}).timeout(0)
})
