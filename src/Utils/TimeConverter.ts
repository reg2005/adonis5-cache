import ms from 'ms'
import { TtlUnits } from '@ioc:Adonis/Addons/Adonis5-Cache'

export default class TimeConverter {
	protected defaultTime: number

	constructor(defaultTime: number, protected readonly defaultUnits: TtlUnits) {
		this.defaultTime = this.toMS(defaultTime, this.defaultUnits)
	}

	public toMS(time: number | undefined | null, units: TtlUnits = this.defaultUnits): number {
		if (!time) {
			return this.defaultTime
		}
		return ms(time + units)
	}

	public fromMs(time: number, unit: TtlUnits) {
		switch (unit) {
			case 'years':
			case 'year':
			case 'yrs':
			case 'yr':
			case 'y':
				return Math.round(time / (1000 * 60 * 60 * 24 * 365))
			case 'weeks':
			case 'week':
			case 'w':
				return Math.round(time / (1000 * 60 * 60 * 24 * 7))
			case 'days':
			case 'day':
			case 'd':
				return Math.round(time / (1000 * 60 * 60 * 24))
			case 'hours':
			case 'hour':
			case 'hrs':
			case 'hr':
			case 'h':
				return Math.round(time / (1000 * 60 * 60))
			case 'minutes':
			case 'minute':
			case 'mins':
			case 'min':
			case 'm':
				return Math.round(time / (1000 * 60))
			case 'seconds':
			case 'second':
			case 'secs':
			case 'sec':
			case 's':
				return Math.round(time / 1000)
			case 'milliseconds':
			case 'millisecond':
			case 'msecs':
			case 'msec':
			case 'ms':
				return time
			default:
				throw Error('Unregistered unit for ms')
		}
	}
}
