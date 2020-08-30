import { IocContract } from '@adonisjs/fold/build'
import { Ignitor } from '@adonisjs/core/build/src/Ignitor'
import { createServer } from 'http'
import { Bootstrapper } from '@adonisjs/core/build/src/Ignitor/Bootstrapper'
import { HttpServer } from '@adonisjs/core/build/src/Ignitor/HttpServer'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { ConfigContract } from '@ioc:Adonis/Core/Config'
import { join } from 'path'

export interface AdonisProvider {
	register(): void

	boot(): void
}

export interface ApplicationConfig {
	configName: string
	appConfig: object
}

export type ProviderConstructor = new (ioc: IocContract) => AdonisProvider

export class AdonisApplication {
	private _bootstrapper: Bootstrapper
	private _httpServer: HttpServer
	private _application: ApplicationContract
	private customerProviderInstance: AdonisProvider[] = []

	constructor(
		private customProviders: ProviderConstructor[] = [],
		private appConfigs: ApplicationConfig[] = []
	) {}

	public registerProvider(provider: ProviderConstructor): AdonisApplication {
		this.customProviders.push(provider)
		return this
	}

	public registerAppConfig(config: ApplicationConfig): AdonisApplication {
		this.appConfigs.push(config)
		return this
	}

	public async loadApp(): Promise<AdonisApplication> {
		await this.initApplication()
		await this.initCustomProviders()
		await this.registerProviders()
		await this.initApplicationConfigs()
		await this.bootProviders()

		return this
	}

	public async loadAppWithHttpServer(): Promise<AdonisApplication> {
		await this.loadApp()
		await this.startHttpServer()

		return this
	}

	private initApplication() {
		const ignitor = new Ignitor(join(__dirname, 'testAdonisApp'))
		this._bootstrapper = ignitor.boostrapper()
		this._httpServer = ignitor.httpServer()
		this._application = this._bootstrapper.setup()
	}

	private async initCustomProviders() {
		this.customerProviderInstance = this.customProviders.map((Provider) => {
			return new Provider(this._application.container)
		})
	}

	private async registerProviders() {
		this._bootstrapper.registerAliases()
		this._bootstrapper.registerProviders(false)
		this.customerProviderInstance.map((provider) => provider.register())
	}

	private async initApplicationConfigs() {
		const config: ConfigContract = this._application.container.use<ConfigContract>(
			'Adonis/Core/Config'
		)
		this.appConfigs.map(({ appConfig, configName }) => config.set(configName, appConfig))
	}

	private async bootProviders() {
		this.customerProviderInstance.map((provider) => provider.boot())
		await this._bootstrapper.bootProviders()
	}

	private async startHttpServer() {
		this._httpServer.injectBootstrapper(this._bootstrapper)
		await this._httpServer.start((handler) => createServer(handler))
	}

	public get bootstrapper(): Bootstrapper {
		return this._bootstrapper
	}

	public get httpServer(): HttpServer {
		return this._httpServer
	}

	public get application(): ApplicationContract {
		return this._application
	}

	public get iocContainer(): IocContract {
		return this._application.container
	}

	public static initApplication(
		customProviders: ProviderConstructor[] = [],
		appConfigs: ApplicationConfig[] = []
	) {
		const app = new AdonisApplication(customProviders, appConfigs)
		return app.loadAppWithHttpServer()
	}

	public async stopServer() {
		await this._httpServer.close()
	}
}
