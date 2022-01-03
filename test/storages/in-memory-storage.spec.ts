import test from 'japa'
import { expect } from 'chai'
import AdonisApplication from 'adonis-provider-tester'
import AdonisCacheProvider from '../../providers/AdonisCacheProvider'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { sleep } from '../test-utils'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'in-memory',
	enabledCacheStorages: ['in-memory'],
	cacheKeyPrefix: '',
	ttlUnits: 'ms',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
}

test.group('Adonis cache provider with in memory driver', (group) => {
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

	test('PUT operation - should save test value to in-memory storage with default record ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)

		const savedValue = await cacheManager.get<string>(testKey)
		expect(savedValue).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized number to storage', async () => {
		const testKey = 'test'
		const testValue = 1

		await cacheManager.put(testKey, testValue)
		const savedValue = await cacheManager.get<number>(testKey)
		expect(savedValue).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized boolean to storage', async () => {
		const testKey = 'test'
		const testValue = true

		await cacheManager.put(testKey, testValue)
		const savedValue = await cacheManager.get<boolean>(testKey)
		expect(savedValue).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized array to storage', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await cacheManager.put(testKey, testValue)

		const savedValue = await cacheManager.get<string>(testKey)

		expect(savedValue).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized object to storage', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '1', c: false }

		await cacheManager.put(testKey, testValue)

		const savedValue = await cacheManager.get<string>(testKey)

		expect(savedValue).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save test value to in-memory storage with specific ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 500)

		const savedValue = await cacheManager.get<string>(testKey)

		expect(savedValue).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should return null value, record ttl are over', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 100)
		await sleep(150)

		const savedValue = await cacheManager.get<string>(testKey)
		expect(savedValue).to.be.null
	}).timeout(0)

	test('PUT MANY operation - should save several values to in-memory storage with default record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await cacheManager.get<string>(testKey)
			expect(savedValue).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should save several values in-memory storage with specific record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 1000)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await cacheManager.get<string>(testKey)
			expect(savedValue).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should return null values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 100)
		await sleep(120)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await cacheManager.get<string>(testKey)
			expect(savedValue).to.be.null
		}
	}).timeout(0)

	test('PUT MANY operation - should return null values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 100)
		await sleep(120)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await cacheManager.get<string>(testKey)
			expect(savedValue).to.be.null
		}
	}).timeout(0)

	test('GET operation - should return null, record with such key does not exits', async () => {
		const savedValue = await cacheManager.get<string>('fake key')
		expect(savedValue).to.be.null
	}).timeout(0)

	test('GET operation - should return stored value', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.equal(testValue)
	}).timeout(0)

	test('GET operation - should return stored array', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await cacheManager.put(testKey, testValue)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET operation - should return stored object', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '2', c: false }

		await cacheManager.put(testKey, testValue)

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET MANY operation - should return null values, records do not exist', async () => {
		const readedValue = await cacheManager.getMany(['fake value'])
		expect(readedValue).to.be.eql([null])
	}).timeout(0)

	test('GET MANY operation - should return stored values', async () => {
		const testMap = { test1: '1', test2: 2 }
		await cacheManager.putMany(testMap)

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
		const testKey = 'test'

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

		expect(await cacheManager.get(testKey1)).to.be.null
		expect(await cacheManager.get(testKey2)).to.be.null
	}).timeout(0)
})
