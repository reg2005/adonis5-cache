# Adonis5-Cache

> In memory cache for Adonis JS, Redis cache for Adonis JS , AdonisJS, Cache for Adonis, Memcached storage

[![typescript-image]][typescript-url] [![npm-image]][npm-url] [![license-image]][license-url]

Cache for AdonisJS 5

Supported cache storages:

- Redis storage
- In memory storage
- Memcached storage

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Installation](#installation)
- [Sample Usage](#sample-usage)
- [Custom storages](#custom-storages)
- [Redis storage](#redis-storage)
- [Memcached storage](#memcached-storage)
- [Storage toggle](#storage-toggle)
- [Custom context](#custom-context)
    - [Enable custom context as default](#enable-custom-context-as-default)
    - [Cache fallback](#cache-fallback)
- [Cache events](#cache-events)
- [Cache tags](#cache-tags)
- [Cache record TTL](#cache-record-ttl)
- [Sharable cache](#sharable-cache)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation

```bash
npm i --save adonis5-cache
```

Compile your code:

```bash
node ace serve --watch
```

Install provider:

```bash
node ace invoke adonis5-cache
```

* For other configuration, please update the `config/cache.ts`.

# Sample Usage

After adding cache provider to your app, you can import CacheManager for accessing to cache.

```js
 import Cache from '@ioc:Adonis/Addons/Adonis5-Cache'
```
* 
  For example you can use cache for reduce amount of requests to external API. You can storing responses to cache in such way:
  ```js
  
  import Cache from '@ioc:Adonis/Addons/Adonis5-Cache'
  
  export default class Service {
    constructor () {
    }
  
    public async loadDataFromExternalApi (userCode) {
      let userData = await Cache.get<UserDTO>(userCode)
      if (!userData) {
        userData = //load data from external api
        await Cache.put(userData)
      }    
 
      return userData
    }
  }
  ```
# Custom storages

You can add additional cache storages for saving cache data. You have to implement **CacheStorageContract** interface by
your class:

```js
import { CacheStorageContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

class CustomCacheStorage implements CacheStorageContract {

	get<T = any>(context: CacheContextContract, key: string): Promise<T | null> {
		// method implementation
	}

	getMany<T = any>(context: CacheContextContract, keys: string[]): Promise<(T | null)[]> {
		// method implementation
	}

	put(context: CacheContextContract, key: string, value, ttl: number): Promise<void> | void {
		// method implementation
	}

	putMany(context: CacheContextContract, cacheDictionary, ttl: number): Promise<void> | void {
		// method implementation
	}

}
```

After creating custom storage you have to register your storage to cache manager:

```js
import Cache from '@ioc:Adonis/Addons/Adonis5-Cache'

Cache.registerStorage('storage-name', storageInstance)
```

# Redis storage

For using redis storage install [adonis-redis package](https://www.npmjs.com/package/@adonisjs/redis/v/alpha)

```bash
npm i @adonisjs/redis@alpha
```

After it you should invoke generator for configuring package:

```bash
node ace invoke @adonisjs/redis
```

Configure redis in `config/redis.ts` and add `redis` storage to cache config in `config/cache.ts`:

```json
{
	"currentCacheStorage": "redis",
	"enabledCacheStorages": [
		"redis"
	]
}
```

# Memcached storage

For using memcached storage install [adonis-memcached client](https://www.npmjs.com/package/adonis5-memcached-client)

```bash
npm i adonis5-memcached-client
```

After it you should invoke generator for configuring package:

```bash
node ace invoke adonis5-memcached-client
```

Configure memcached client in `config/memcached.ts` and add `memcached` storage to cache config in `config/cache.ts`:

```json
{
	"currentCacheStorage": "memcached",
	"enabledCacheStorages": [
		"memcached"
	]
}
```

# Storage toggle

After registration you can use your storage in such way:

```js
const cachedValue = await Cache.viaStorage('storage-name').get('cache-key')
```

Or you can enable your storage as default cache storage:

```
Cache.enableStorage('storage-name')

const cachedValue = await Cache.get('cache-key') // value will be received from your storage
```

# Custom context

Cache contexts responsible for serialization and deserialization your data to cache storages. For example you can add
additional keys or transform you data before serialization and deserialization processes.

You can implement your context is like to custom cache storage, your custom context have to implement **
CacheContextContract**:

```js
import { CacheContextContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

const customContext: CacheContextContract = {
	
	serialize: (data: any) => { JSON.stringify({ data: data, serializedAt: Date.now })},
	
	deserialize: (cacheRecord:string) => ({ ...JSON.parse(cacheRecord), deserializedAt: Date.now }),
}

```

After implementation you have to register new context:

```js
Cache.registerContext('custom-context-name', customContext)
```

And then you can using new context when you accessing to cache storage:

```js
const cachedValue = await Cache.get<RecordDTO>('cache-key') // Reading data from cache using custom context

await Cache.put('cache-key', cachedData) // Storing data to cache using custom context
```

### Enable custom context as default

Of course, you can enable your custom context as default cache context:

```js

Cache.enableContext('custom-context-name') // After this your cache operations will be use your custom context
```

### Cache fallback

You can pass fallback value when you calling get method:

```js
const cachedValue = await Cache.get < RecordDTO > ('cache-key', fallbackValue)

```

Or pass async function as fallback value in the following way

```js
const cachedValue = await Cache.get<RecordDTO>('cache-key', async () => { 
  return callApi(); 
})
```

If cache storage value doesn't exists fallback value will storage to cache by selected key. You can specify ttl for
fallback value as function parameter:

```js
const cachedValue = await Cache.get<RecordDTO>('cache-key', fallbackValue, customTTL)
```

# Cache events

Cache provider implements several events:

- cache-record:read
- cache-record:written
- cache-record:missed
- cache-record:forgotten

You can add listener for this events in the following ways:

```js
import Event from '@ioc:Adonis/Core/Event'

Event.on('cache-record:missed', 'CacheEventListener.handleCacheRecordMissedEvent')
```

You can configure which events are emitted with cache config:

```js
{
	recordTTL: 10000,
	currentCacheStorage: 'redis',
	enabledCacheStorages: ['redis'],
	cacheKeyPrefix: '',
	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	}
}
```

# Cache tags

When you need partial flushing your cache you can use cache tags. This features allow you tag your cache records and
then flush only tagged records. For using cache tags you should call method __tags__ on cache manager with list of your
tags as argument, then you get TaggedCacheManager, which allow you using tagged cache functionality.

```js
Cache.tags('tag-1', 'tag-2', 'tag-3')
```

Actually for writing cache record with tags you can in the following way:

```js
await Cache.tags('tag-1', 'tag-2', 'tag-3').put('key', 'value')
```

Or store dictionary with cache records:
Actually for writing cache record with tags you can in the following way:

```js
await Cache.tags('tag-1', 'tag-2', 'tag-3').putMany({ key: 'value' })
```

Then you can clear tagged records in the following way:

```js
await Cache.tags('tag-1', 'tag-2', 'tag-3').flush()
```

During this operation tags and tagger records will be removed from storage, however records with another tags will
remain in your storage. This is great feature for storing responses from different API's. You can tag each response by
appropriate tag and flush responses only for desirable API.

# Cache record TTL
You can configure record TTL using cache config: 
```js
{	
    recordTTL: 60000,
    ttlUnits: 'ms'
}
```

Or you can set record ttl as function parameter:

```js
 await Cache.put(userData, 1000)
```

Your value will be transformed to milliseconds using time units which configured by **ttlUnits** parameter in your cache
config.

# Sharable cache
When you need to share cache between several instances you can enable sharable mode.  
For enabling you should add sharable cache provider:
```json
{
	"providers": [
		"./providers/AppProvider",
		"adonis5-cache",
		"adonis5-cache/sharable-cache-provider"
	]
}
```
and setup your `config/cache.ts` for using shared cache
```js
{
sharedCacheConfig: {
		isSharingEnabled: true,
		syncInterval: 2000
	}
}
```
- isSharingEnabled - responds for enabling sharing mode for cache 
- syncInterval - interval between running sync operation. Use milliseconds unit for this option


Cache synchronized via redis as transport layer. So you need to install [adonis-redis](https://www.npmjs.com/package/@adonisjs/redis/v/alpha) package for using sharable cache.
```bash
npm i @adonisjs/redis@alpha
```

For manual enabling and disabling synchronization you can call special methods on cache manager instance
```js
import CacheManager from "@ioc:Adonis/Addons/Adonis5-Cache";

CacheManager.stopSynchronization()

CacheManager.runSynchronization()
```

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript

[typescript-url]:  "typescript"

[npm-image]: https://img.shields.io/npm/v/adonis5-cache.svg?style=for-the-badge&logo=npm

[npm-url]: https://npmjs.org/package/adonis5-cache "npm"

[license-image]: https://img.shields.io/npm/l/adonis5-cache?color=blueviolet&style=for-the-badge

[license-url]: LICENSE.md "license"
