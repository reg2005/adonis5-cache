import { IocContract } from '@adonisjs/fold/build'
import CacheManager from '../src/CacheManager'

export default class AdonisCacheProvider {
	constructor(protected container: IocContract) {}

	public boot(): void {
		this.container.singleton('Adonis/Addons/Adonis5-Cache', () => {
			return new CacheManager(this.container)
		})
	}

	public register(): void {}
}
