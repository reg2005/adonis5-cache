import test from 'japa'
import { AdonisApplication } from '../../test-helpers/TestAdonisApp'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { expect } from 'chai'
import RedisProvider from '@adonisjs/redis/build/providers/RedisProvider'
import redisConfig from '../fixtures/redis-test-config'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { RedisCacheDistributorTransport } from '../../src/SharableCacheTransports/RedisCacheDistributorTransport'
import sleep from '../../test-helpers/utils/sleep'
import AdonisSharableCacheProvider from '../../providers/AdonisSharableCacheProvider'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'in-memory',
	enabledCacheStorages: ['in-memory'],
	cacheKeyPrefix: '',
	ttlUnits: 'seconds',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
	sharedCacheConfig: {
		isSharingEnabled: true,
		syncInterval: 10,
	},
}

test.group('Adonis shared cache - e2e testing', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let redis: RedisManagerContract
	let testTransport: RedisCacheDistributorTransport

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(RedisProvider)
			.registerProvider(AdonisSharableCacheProvider)
			.registerAppConfig({ configName: 'redis', appConfig: redisConfig })
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-SharableCache')
		redis = adonisApp.iocContainer.use('Adonis/Addons/Redis')
		testTransport = new RedisCacheDistributorTransport(redis)
		await sleep(1000)
	})

	test('should call put operation via sharable cache', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'

		await testTransport.sync([
			{
				method: 'put',
				isReturnThis: false,
				args: [testKey, testValue, 10000],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		const synchronizedValue = await cacheManager.get(testKey)

		expect(synchronizedValue).equal(testValue)
	}).timeout(0)

	test('should call putMany operation via sharable cache', async () => {
		const testMap = { a: 1, b: 2 }

		await testTransport.sync([
			{
				method: 'putMany',
				isReturnThis: false,
				args: [testMap, 10000],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		for (const [testKey, testValue] of Object.entries(testMap)) {
			const synchronizedValue = await cacheManager.get(testKey)
			expect(synchronizedValue).equal(testValue)
		}
	}).timeout(0)

	test('should call forget operation via sharable cache', async () => {
		const testKey = 'testKey'

		await cacheManager.put(testKey, 'value', 100000)

		await testTransport.sync([
			{
				method: 'forget',
				isReturnThis: false,
				args: [testKey],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		const forgottenValue = await cacheManager.get(testKey)

		expect(forgottenValue).to.be.null
	}).timeout(0)

	test('should call flush operation via sharable cache', async () => {
		const testMap = { a: 'a', b: 'b' }

		await cacheManager.putMany(testMap, 100)

		await testTransport.sync([
			{ method: 'flush', isReturnThis: false, args: [], createdAt: new Date().toISOString() },
		])

		await sleep(1000)

		for (const forgottenKey of Object.keys(testMap)) {
			const forgottenValue = await cacheManager.get(forgottenKey)
			expect(forgottenValue).to.be.null
		}
	}).timeout(0)

	test('should toggle tempStorageName via sharable cache', async () => {
		const testStorage = 'test-storage'
		const testStorageName = 'test-storage-name'
		cacheManager.registerStorage(testStorageName, testStorage as any)

		await testTransport.sync([
			{
				method: 'viaStorage',
				isReturnThis: true,
				args: [testStorageName],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		// @ts-ignore
		expect(cacheManager.tempStorageName).to.equal(testStorageName)
	}).timeout(0)

	test('should toggle tempContextName via sharable cache', async () => {
		const testContext = 'test-context'
		const testContextName = 'test-context-name'
		cacheManager.registerContext(testContextName, testContext as any)

		await testTransport.sync([
			{
				method: 'viaContext',
				isReturnThis: true,
				args: [testContextName],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		// @ts-ignore
		expect(cacheManager.tempContextName).to.equal(testContextName)
	}).timeout(0)

	test('should toggle storage via sharable cache', async () => {
		const testStorage = 'test-storage'
		const testStorageName = 'test-storage-name'
		cacheManager.registerStorage(testStorageName, testStorage as any)

		await testTransport.sync([
			{
				method: 'enableStorage',
				isReturnThis: false,
				args: [testStorageName],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		expect(cacheManager.storage).to.equal(testStorage)
	}).timeout(0)

	test('should toggle context via sharable cache', async () => {
		const testContext = 'test-context'
		const testContextName = 'test-context-name'
		cacheManager.registerContext(testContextName, testContext as any)

		await testTransport.sync([
			{
				method: 'enableContext',
				isReturnThis: false,
				args: [testContextName],
				createdAt: new Date().toISOString(),
			},
		])

		await sleep(1000)

		// @ts-ignore
		expect(cacheManager.currentCacheContextName).to.equal(testContextName)
	}).timeout(0)
})
