import dotenv from 'dotenv'
import { AdonisMemcachedClientConfig } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'

dotenv.config()

if (!process.env.MEMCACHED_SERVER_URL) {
	throw new Error('MEMCACHED_SERVER_URL is required env variable')
}

const config: AdonisMemcachedClientConfig = {
	server: process.env.MEMCACHED_SERVER_URL,
}
export default config
