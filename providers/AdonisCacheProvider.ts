import CacheManager from '../src/CacheManager'
import { ConstructorParams } from '@ioc:Adonis/Addons/Adonis5-Cache'
import BaseAdonisCacheProvider from './BaseAdonisCacheProvider'

export default class AdonisCacheProvider extends BaseAdonisCacheProvider {
	public get providerAlias(): string {
		return 'Adonis/Addons/Adonis5-Cache'
	}

	public get cacheManagerClass(): { new (args: ConstructorParams): CacheManager } {
		return CacheManager
	}
}
