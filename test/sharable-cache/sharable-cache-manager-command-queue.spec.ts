import test from 'japa'
import { CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { CacheCommand } from '@ioc:Adonis/Addons/Adonis5-SharableCache'
import { expect } from 'chai'
import InMemoryStorage from '../../src/CacheStorages/InMemoryStorage'
import { anyString, instance, mock } from 'ts-mockito'

import SharableCacheManager from '../../src/SharableCacheManager'
import { Emitter } from '@adonisjs/events/build/src/Emitter'
import { RedisCacheDistributorTransport } from '../../src/SharableCacheTransports/RedisCacheDistributorTransport'
import DefaultCacheContext from '../../src/CacheContexts/DefaultCacheContext'

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
		syncInterval: 2000,
	},
}

function extractQueue(cacheManager: SharableCacheManager): CacheCommand[] {
	// @ts-ignore
	return cacheManager.commandQueue
}

test.group('Adonis sharable cache provider - test queue', () => {
	function initSharableCacheManager(config: CacheConfig) {
		const transportMock = mock(RedisCacheDistributorTransport)
		const mockedStorage: InMemoryStorage = mock(InMemoryStorage)

		const cacheManager = new SharableCacheManager({
			config,
			eventEmitter: instance(mock(Emitter)),
		})

		cacheManager.registerStorage(config.currentCacheStorage, instance(mockedStorage))
		cacheManager.enableStorage(config.currentCacheStorage)

		// @ts-ignore
		cacheManager.commandQueue = []

		return { transportMock, cacheManager, mockedStorage }
	}

	test('should add command to command queue on put operation', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'

		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.put(testKey, testValue)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'put',
				args: [testKey, testValue, undefined],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on put operation with ttl in args', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const testTtl = 200

		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.put(testKey, testValue, testTtl)

		const queue = extractQueue(cacheManager)
		expect(queue.length).to.equal(1)

		const [queueElement] = queue
		expect(queueElement).to.deep.include({
			method: 'put',
			args: [testKey, testValue, testTtl],
			isReturnThis: false,
		})
	}).timeout(0)

	test('should add command to command queue on putMany operation', async () => {
		const testCacheMap = { a: 2, b: 3 }

		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.putMany(testCacheMap)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'putMany',
				args: [testCacheMap, undefined],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on putMany operation with specified ttl', async () => {
		const testCacheMap = { a: 2, b: 3 }
		const testTtl = 200

		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.putMany(testCacheMap, testTtl)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'putMany',
				args: [testCacheMap, testTtl],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on forget operation', async () => {
		const testKey = 'key'

		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.forget(testKey)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'forget',
				args: [testKey],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on flush operation', async () => {
		const { cacheManager } = initSharableCacheManager(cacheConfig)

		await cacheManager.flush()

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'flush',
				args: [],
				isReturnThis: false,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on viaContext operation', async () => {
		const { cacheManager } = initSharableCacheManager(cacheConfig)

		const context = 'test-context'
		cacheManager.registerContext(context, DefaultCacheContext)

		cacheManager.viaContext(context)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'viaContext',
				args: [context],
				isReturnThis: true,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)

	test('should add command to command queue on viaStorage operation', async () => {
		const { cacheManager } = initSharableCacheManager(cacheConfig)

		const storage = 'in-memory'
		await cacheManager.viaStorage(storage)

		expect(extractQueue(cacheManager)).to.deep.eq([
			{
				method: 'viaStorage',
				args: [storage],
				isReturnThis: true,
				createdAt: new Date().toISOString(),
			},
		])
	}).timeout(0)
})
