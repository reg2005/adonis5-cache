import test from 'japa'
import { expect } from 'chai'
import { AdonisApplication } from '../../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../../providers/AdonisCacheProvider'
import RedisProvider from '@adonisjs/redis/build/providers/RedisProvider'
import redisConfig from '../fixtures/redis-test-config'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { RedisConnectionContract } from '@ioc:Adonis/Addons/Redis'
import sleep from '../../test-helpers/utils/sleep'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'redis',
	enabledCacheStorages: ['redis'],
}

test.group('Adonis cache provider with REDIS driver', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let redis: RedisConnectionContract

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(RedisProvider)
			.registerProvider(AdonisCacheProvider)
			.registerAppConfig({ configName: 'redis', appConfig: redisConfig })
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-Cache')
		redis = adonisApp.iocContainer.use('Adonis/Addons/Redis')
	})

	group.beforeEach(async () => {
		await redis.flushdb()
	})

	test('PUT operation - should save test value to redis storage with default record ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)
		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized number to storage', async () => {
		const testKey = 'test'
		const testValue = 1

		await cacheManager.put(testKey, testValue)
		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized boolean to storage', async () => {
		const testKey = 'test'
		const testValue = true

		await cacheManager.put(testKey, testValue)
		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized array to storage', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await cacheManager.put(testKey, testValue)
		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save serialized object to storage', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '1', c: false }

		await cacheManager.put(testKey, testValue)
		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.eql(testValue)
	}).timeout(0)

	test('PUT operation - should save test value to redis storage with specific ttl', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 500)
		const savedValue = await redis.get(testKey)

		expect(JSON.parse(savedValue as string)).to.equal(testValue)
	}).timeout(0)

	test('PUT operation - should return null value, record ttl are over', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue, 100)
		await sleep(120)

		const savedValue = await redis.get(testKey)
		expect(savedValue).to.be.null
	}).timeout(0)

	test('PUT MANY operation - should save several values to redis storage with default record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await redis.get(testKey)
			expect(JSON.parse(savedValue as string)).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should save several values redis storage with specific record ttl', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 1000)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const savedValue = await redis.get(testKey)
			expect(JSON.parse(savedValue as string)).to.equal(testValue)
		}
	}).timeout(0)

	test('PUT MANY operation - should return null values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 100)
		await sleep(120)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await redis.get(testKey)
			expect(savedValue).to.be.null
		}
	}).timeout(0)

	test('PUT MANY operation - should return null values, records ttl are over', async () => {
		const testMap = { test1: '1', test2: 2 }

		await cacheManager.putMany(testMap, 100)
		await sleep(120)

		for (const testKey of Object.keys(testMap)) {
			const savedValue = await redis.get(testKey)
			expect(savedValue).to.be.null
		}
	}).timeout(0)

	test('GET operation - should return null, record with such key does not exits', async () => {
		const readedValue = await redis.get('fake key')
		expect(readedValue).to.be.null
	}).timeout(0)

	test('GET operation - should return stored value', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await redis.set(testKey, JSON.stringify(testValue))

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.equal(testValue)
	}).timeout(0)

	test('GET operation - should return stored array', async () => {
		const testKey = 'test'
		const testValue = [1, '2', true]

		await redis.set(testKey, JSON.stringify(testValue))

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET operation - should return stored object', async () => {
		const testKey = 'test'
		const testValue = { a: 1, b: '2', c: false }

		await redis.set(testKey, JSON.stringify(testValue))

		const readedValue = await cacheManager.get(testKey)
		expect(readedValue).to.be.eql(testValue)
	}).timeout(0)

	test('GET MANY operation - should return null values, records do not exist', async () => {
		const readedValue = await cacheManager.getMany(['fake value'])
		expect(readedValue).to.be.eql([null])
	}).timeout(0)

	test('GET MANY operation - should return stored values', async () => {
		const testMap = { test1: '1', test2: 2 }
		await Promise.all(Object.entries(testMap).map(([k, v]) => redis.set(k, JSON.stringify(v))))

		const readedValue = await cacheManager.getMany(Object.keys(testMap))
		expect(readedValue).to.be.eql(Object.values(testMap))
	}).timeout(0)

	test('FORGET operation - should remove cached value', async () => {
		const testKey = 'test'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)

		await cacheManager.forget(testKey)

		const readedValue = await redis.get(testKey)
		expect(readedValue).to.be.null
	}).timeout(0)

	test('FLUSH operation - should clean cache storage', async () => {
		const testKey1 = 'test-key-1'
		const testKey2 = 'test-key-'
		const testValue = 'testValue'

		await cacheManager.put(testKey1, testValue)
		await cacheManager.put(testKey2, testValue)

		await cacheManager.flush()

		expect(await redis.get(testKey1)).to.be.null
		expect(await redis.get(testKey2)).to.be.null
	}).timeout(0)
})
