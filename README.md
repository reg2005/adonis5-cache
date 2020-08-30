
# Adonis5-Cache
> In memory cache for Adonis JS, Redis cache for Adonis JS , AdonisJS, Cache for Adonis

[![typescript-image]][typescript-url] [![npm-image]][npm-url] [![license-image]][license-url]

Cache for AdonisJS 5

Supported cache storages:
- Redis storage
- In memory storage

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Installation](#installation)
- [Sample Usage](#sample-usage)
- [Custom storages](#custom-storages)
- [Custom context](#custom-context)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation
```bash
npm i --save adonis5-cache
```
Compile your code:
```bash
node ace serve --watch
```
Connect all dependences:
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
  
    public async loadDataFromExtarnalApi (userCode) {
      let userData = await Cache.get<UserDTO>(userCode)
      if (!userData) {
        userData = //load data from extarnal api
        await Cache.put(userData)
      }    
 
      return userData
    }
  }
  ```
# Custom storages
You can add additional cache storages for saving cache data. You have to implement **CacheStorageContract** interface by your class:
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
Cache contexts responsible for serialization and deserialization your data to cache storages. For example you can add additional keys or transform you data before serialization and deserialization processes.

You can implement your context is like to custom cache storage, your custom context have to implement **CacheContextContract**:
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
Of course, you can enable your custom context as default cache context:
```js

Cache.enableContext('custom-context-name') // After this your cache operations will be use your custom context
```
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"

[npm-image]: https://img.shields.io/npm/v/adonis5-cache.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/adonis5-cache "npm"

[license-image]: https://img.shields.io/npm/l/adonis5-cache?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
