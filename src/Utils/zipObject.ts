export default function <T = any>(keys: string[], values: T): Record<string, T> {
	return keys.reduce((acc, key, index) => {
		return Object.assign(acc, { [key]: values[index] })
	}, {})
}
