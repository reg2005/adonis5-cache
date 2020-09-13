import test from 'japa'

import { TaggableCacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

import InMemoryStorage from '../../src/CacheStorages/InMemoryStorage'
import { anyString, instance, mock, objectContaining, verify, when } from 'ts-mockito'
import TaggableCacheManager from '../../src/TaggableCacheManager'
import CacheManager from '../../src/CacheManager'
import dayjs from 'dayjs'
import { buildTagKey } from './helpers'

function buildTagMetadata(expirationTime: string, keys: string[] = []): string {
	return JSON.stringify({ expirationTime, keys })
}

test.group('Adonis cache provider - test cache manager API', () => {
	let testKey: string = 'testKey'
	let testValue: string = 'testValue'

	test('should save record to cache and store tag metadata for tags', async () => {
		const tags = ['test-tag']
		const mockedStorage = mock(InMemoryStorage)
		const mockedCacheManager = mock(CacheManager)
		when(mockedCacheManager.storage).thenReturn(instance(mockedStorage))

		const manager: TaggableCacheManagerContract = new TaggableCacheManager(
			instance(mockedCacheManager),
			tags
		)
		await manager.put(testKey, testValue)

		verify(mockedCacheManager.put(testKey, testValue, undefined)).once()
		verify(mockedStorage.addTag(buildTagKey(tags[0]), anyString())).once()
	}).timeout(0)

	test('should save cache records to db to cache and store tag metadata for tags', async () => {
		const tags = ['test-tag']
		const mockedStorage = mock(InMemoryStorage)
		const mockedCacheManager = mock(CacheManager)
		when(mockedCacheManager.storage).thenReturn(instance(mockedStorage))

		const manager: TaggableCacheManagerContract = new TaggableCacheManager(
			instance(mockedCacheManager),
			tags
		)
		await manager.putMany({ [testKey]: testValue })

		verify(mockedCacheManager.putMany(objectContaining({ [testKey]: testValue }), undefined)).once()
		verify(mockedStorage.addTag(buildTagKey(tags[0]), anyString())).once()
	}).timeout(0)

	test('should remove all records, which saved by selected tags', async () => {
		const tags = ['test-tag']
		const mockedStorage = mock(InMemoryStorage)
		const mockedCacheManager = mock(CacheManager)
		when(mockedCacheManager.storage).thenReturn(instance(mockedStorage))
		when(mockedStorage.readTag(buildTagKey(tags[0]))).thenReturn(
			Promise.resolve([buildTagMetadata(dayjs().add(1, 'day').toISOString(), [testKey])]),
			Promise.resolve([buildTagMetadata(dayjs().add(1, 'day').toISOString(), ['expiredKey'])])
		)

		const manager: TaggableCacheManagerContract = new TaggableCacheManager(
			instance(mockedCacheManager),
			tags
		)
		await manager.flush()

		verify(mockedCacheManager.forget(testKey)).once()
		verify(mockedStorage.removeTag(buildTagKey(tags[0]))).once()
	}).timeout(0)
})
