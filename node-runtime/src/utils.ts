export type DeepReadonly<T> = T extends undefined | null | boolean | string | number | Function
  ? T
  : T extends []
  ? readonly []
  : T extends [infer U, ...infer Rest]
  ? readonly [DeepReadonly<U>, ...DeepReadonly<Rest>]
  : T extends Array<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export function has<P extends PropertyKey>(target: object, property: P): target is { [K in P]: unknown } {
  return property in target;
}
