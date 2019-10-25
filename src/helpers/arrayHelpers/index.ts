export function sample<T>(array: T[]) {
	const length = array == null ? 0 : array.length;
	return length ? array[Math.floor(Math.random() * length)] : undefined;
}
