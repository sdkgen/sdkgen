export function sample<T>(array: T[] | null): T | undefined {
  const length = array === null ? 0 : array.length;

  return length && array ? array[Math.floor(Math.random() * length)] : undefined;
}
