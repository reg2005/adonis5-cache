import test from 'japa'
import { AdonisApplication } from '../test-helpers/TestAdonisApp'
import AdonisCacheProvider from '../providers/AdonisCacheProvider'
import { CacheManagerContract, CacheConfig, EventPayload } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { last, takeLast } from 'ramda'
import { expect } from 'chai'

const cacheConfig: CacheConfig = {
	recordTTL: 1000,
	currentCacheStorage: 'in-memory',
	enabledCacheStorages: ['in-memory'],
	cacheKeyPrefix: '',
	enabledEvents: {
		'cache-record:read': true,
		'cache-record:written': true,
		'cache-record:missed': true,
		'cache-record:forgotten': true,
	},
}

type TrappedEvent = { eventType: string; payload: EventPayload }
test.group('Adonis cache provider - test for event emitting', (group) => {
	let adonisApp: AdonisApplication
	let cacheManager: CacheManagerContract
	let trappedEvents: TrappedEvent[] = []

	group.before(async () => {
		adonisApp = new AdonisApplication()
		await adonisApp
			.registerProvider(AdonisCacheProvider)
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.loadApp()

		cacheManager = adonisApp.iocContainer.use('Adonis/Addons/Adonis5-Cache')
		const eventEmitter = adonisApp.iocContainer.use('Adonis/Core/Event')

		eventEmitter.trapAll((eventType: string, payload: EventPayload) => {
			trappedEvents.push({ eventType, payload })
		})
	})

	test('should emit event on missed cache key', async () => {
		const testKey = 'testKey'

		await cacheManager.get(testKey)

		const { eventType, payload } = last(trappedEvents)

		expect(eventType).to.equal('cache-record:missed')
		expect(payload).to.eql({ keys: [testKey] })
	}).timeout(0)

	test('should emit event on read cache record', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		await cacheManager.put(testKey, testValue)

		await cacheManager.get(testKey)

		const { eventType, payload } = last(trappedEvents)

		expect(eventType).to.equal('cache-record:read')
		expect(payload).to.eql({ [testKey]: testValue })
	}).timeout(0)

	test('should emit event on write value to cache', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)

		const { eventType, payload } = last(trappedEvents)

		expect(eventType).to.equal('cache-record:written')
		expect(payload).to.eql({ [testKey]: testValue })
	}).timeout(0)

	test('should emit event on write multiple values to cache', async () => {
		const cacheDict = { a: 1, b: 'value' }

		await cacheManager.putMany(cacheDict)

		const { eventType, payload } = last(trappedEvents)

		expect(eventType).to.equal('cache-record:written')
		expect(payload).to.eql(cacheDict)
	}).timeout(0)

	test('should emit events on missing keys and read values after multi reading operation', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'
		const missedKey = 'missedKey'

		await cacheManager.put(testValue, testKey)

		await cacheManager.getMany([testKey, missedKey])

		const [missedRecordEvent, readedEvent] = takeLast(2, trappedEvents)

		expect(readedEvent.eventType).to.equal('cache-record:read')
		expect(readedEvent.payload).to.eql({ [testKey]: testValue })

		expect(missedRecordEvent.eventType).to.equal('cache-record:missed')
		expect(missedRecordEvent.payload).to.eql({ keys: [missedKey] })
	}).timeout(0)

	test("should emit events on record forgotten, record doesn't exist", async () => {
		const testKey = 'random key'

		await cacheManager.forget(testKey)

		const recordForgottenEvent = last(trappedEvents)

		expect(recordForgottenEvent.eventType).to.equal('cache-record:forgotten')
		expect(recordForgottenEvent.payload).to.eql({ [testKey]: false })
	}).timeout(0)

	test('should emit events on record forgotten, record exists', async () => {
		const testKey = 'testKey'
		const testValue = 'testValue'

		await cacheManager.put(testKey, testValue)
		await cacheManager.forget(testKey)

		const recordForgottenEvent = last(trappedEvents)

		expect(recordForgottenEvent.eventType).to.equal('cache-record:forgotten')
		expect(recordForgottenEvent.payload).to.eql({ [testKey]: true })
	}).timeout(0)
})
