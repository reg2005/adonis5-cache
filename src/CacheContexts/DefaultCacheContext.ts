import { CacheContextContract } from '@ioc:Adonis/Addons/Adonis5-Cache'

export default {
	tags: [],

	serialize: (value: unknown) => {
		return JSON.stringify(value as string)
	},

	deserialize: <T = any>(value: string) => {
		return JSON.parse(value) as T
	},
} as CacheContextContract
