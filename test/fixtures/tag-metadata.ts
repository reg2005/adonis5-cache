import dayjs from 'dayjs'

export default {
	cacheRecordStillValid: {
		expirationTime: dayjs().add(1, 'day').toISOString(),
		keys: [],
	},
}
