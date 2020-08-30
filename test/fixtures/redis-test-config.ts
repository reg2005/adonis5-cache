import dotenv from 'dotenv'

dotenv.config()

export default {
	connection: 'local',
	connections: {
		local: {
			host: process.env.REDIS_HOST,
			port: process.env.REDIS_PORT,
		},
	},
}
