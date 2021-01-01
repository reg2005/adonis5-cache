import test from 'japa'
import { AdonisApplication } from '../../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../../providers/AdonisCacheProvider'
import { CacheManagerContract, CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'

import { expect } from 'chai'
import { flatten } from 'ramda'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import RedisProvider from '@adonisjs/redis/build/providers/RedisProvider'
import redisConfig from '../fixtures/redis-test-config'
import dayjs from 'dayjs'
import { buildTagKey } from './helpers'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'redis',
	enabledCacheStorages: ['redis'],
	cacheKeyPrefix: '',
	ttlUnits: 'ms',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
}

test.group('Adonis cache provider - taggable cache with redis storage', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let redis: RedisManagerContract
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
		redis = adonisApp.iocContainer.use('Adonis/Addons/Redis')
	})

	group.beforeEach(async () => {
		await redis.flushdb()
	})

	test('should save cache record with tags metadata', async () => {
		const tags = ['tag-1']

		await cacheManager.tags(...tags).put(testKey, testValue)

		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.equal(testValue)

		const savedTaggedMetadataRecords = flatten(
			await Promise.all(
				tags.map((tag) => {
					return redis.smembers(buildTagKey(tag))
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

	test('should save cache record collection with tags metadata', async () => {
		const tags = ['tag-1']

		await cacheManager.tags(...tags).putMany({ [testKey]: testValue })

		const savedValue = await redis.get(testKey)
		expect(JSON.parse(savedValue as string)).to.equal(testValue)

		const savedTaggedMetadataRecords = flatten(
			await Promise.all(
				tags.map((tag) => {
					return redis.smembers(buildTagKey(tag))
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

	test('should flush tagged records and stay untagged records', async () => {
		await cacheManager.tags('tag-1').put('t-1', testValue)
		await cacheManager.tags('tag-1', 'tag-2').put('t-2', testValue)
		await cacheManager.tags('tag-3').put('t-3', testValue)

		await cacheManager.tags('tag-1').flush()

		expect(await redis.get('t-1')).to.be.null
		expect(await redis.get('t-2')).to.be.null
		expect(JSON.parse((await redis.get('t-3')) as string)).to.equal(testValue)
	}).timeout(0)

	test('should flush tagged records by several tags and stay untagged records', async () => {
		await cacheManager.tags('tag-1', 'tag-2').put('t-1', testValue)
		await cacheManager.tags('tag-3').put('t-3', testValue)

		await cacheManager.tags('tag-1', 'tag-2').flush()

		expect(await redis.smembers(buildTagKey('tag-1'))).to.eql([])
		expect(await redis.smembers(buildTagKey('tag-2'))).to.eql([])
		expect((await redis.smembers(buildTagKey('tag-3'))).length).to.equal(1)
	}).timeout(0)
})
