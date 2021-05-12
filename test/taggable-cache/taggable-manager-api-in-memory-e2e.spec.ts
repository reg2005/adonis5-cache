import test from 'japa'
import { AdonisApplication } from '../../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../../providers/AdonisCacheProvider'
import {
	CacheManagerContract,
	CacheConfig,
	TaggableStorageContract,
} from '@ioc:Adonis/Addons/Adonis5-Cache'
import { expect } from 'chai'
import { flatten } from 'ramda'
import RedisProvider from '@adonisjs/redis/build/providers/RedisProvider'
import redisConfig from '../fixtures/redis-test-config'
import dayjs from 'dayjs'
import InMemoryStorage from '../../src/CacheStorages/InMemoryStorage'
import DefaultCacheContext from '../../src/CacheContexts/DefaultCacheContext'
import { buildTagKey } from './helpers'

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

test.group('Adonis cache provider - taggable cache with in-memory storage', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let memoryStorage: InMemoryStorage
	let testKey: string = 'testKey'
	let testValue: string = 'testValue'

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(RedisProvider)
			.registerProvider(AdonisCacheProvider)
			.registerAppConfig({ configName: 'redis', appConfig: redisConfig })
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-Cache')
		memoryStorage = cacheManager.storage as InMemoryStorage
	})

	group.beforeEach(async () => {
		await memoryStorage.flush()
	})

	test('should save cache record with tags metadata', async () => {
		const tags = ['tag-1']

		await cacheManager.tags(...tags).put(testKey, testValue)

		const savedValue = await memoryStorage.get(DefaultCacheContext, testKey)
		expect(savedValue as string).to.equal(testValue)

		const savedTaggedMetadataRecords = flatten(
			await Promise.all(
				tags.map((tag) => {
					return (memoryStorage as unknown as TaggableStorageContract).readTag(buildTagKey(tag))
				})
			)
		)

		expect(savedTaggedMetadataRecords.length).to.equal(tags.length)
		savedTaggedMetadataRecords.forEach((metadata) => {
			const { keys, expirationTime } = JSON.parse(metadata as string)
			expect(keys).to.eql([testKey])
			const expectRecordTTL = dayjs().add(cacheManager.recordTTL, 'ms')

			expect(expectRecordTTL.diff(dayjs(expirationTime))).to.be.below(20) // code execution time
		})
	}).timeout(0)

	test('should save cache records with tags metadata', async () => {
		const tags = ['tag-1']

		await cacheManager.tags(...tags).putMany({ [testKey]: testValue })

		const savedValue = await memoryStorage.get(DefaultCacheContext, testKey)
		expect(savedValue as string).to.equal(testValue)

		const savedTaggedMetadataRecords = flatten(
			await Promise.all(
				tags.map((tag) => {
					return (memoryStorage as unknown as TaggableStorageContract).readTag(buildTagKey(tag))
				})
			)
		)

		expect(savedTaggedMetadataRecords.length).to.equal(tags.length)
		savedTaggedMetadataRecords.forEach((metadata) => {
			const { keys, expirationTime } = JSON.parse(metadata as string)
			expect(keys).to.eql([testKey])
			const expectRecordTTL = dayjs().add(cacheManager.recordTTL, 'ms')

			expect(expectRecordTTL.diff(dayjs(expirationTime))).to.be.below(20) // code execution time
		})
	}).timeout(0)

	test('should flush tagged records and keep untagged', async () => {
		await cacheManager.tags('tag-1').put('t-1', testValue)
		await cacheManager.tags('tag-1', 'tag-2').put('t-2', testValue)
		await cacheManager.tags('tag-3').put('t-3', testValue)

		await cacheManager.tags('tag-1').flush()

		expect(await memoryStorage.get(DefaultCacheContext, 't-1')).to.be.null
		expect(await memoryStorage.get(DefaultCacheContext, 't-2')).to.be.null
		expect(await memoryStorage.get(DefaultCacheContext, 't-3')).to.equal(testValue)
	}).timeout(0)

	test('should flush tagged records and keep untagged', async () => {
		await cacheManager.tags('tag-1', 'tag-2').put('t-1', testValue)
		await cacheManager.tags('tag-3').put('t-3', testValue)

		await cacheManager.tags('tag-1', 'tag-2').flush()

		expect(await memoryStorage.readTag(buildTagKey('tag-1'))).to.eql([])
		expect(await memoryStorage.readTag(buildTagKey('tag-2'))).to.eql([])
		expect((await memoryStorage.readTag(buildTagKey('tag-3'))).length).to.equal(1)
	}).timeout(0)
})
