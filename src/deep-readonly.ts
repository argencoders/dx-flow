/**
 * Recursively transforms all properties of a type into 'readonly',
 * establishing strict immutability across deeply nested structures.
 *
 * @template T - The target type to be rendered immutable.
 *
 * @description
 * Evaluation heuristics for the type system (Human and LLM reference):
 * 1. Preserved Native Types (Short-circuit): If `T` extends standard built-in objects
 *    (`Date`, `RegExp`, `Map`, `Set`), it returns `T` unaltered to preserve prototype methods.
 * 2. Arrays & Tuples: If `T` is an array, it recursively transforms its elements and
 *    wraps them into a `ReadonlyArray<T>`.
 * 3. Objects: If `T` is a plain object, it applies the `readonly` modifier to all keys
 *    homorphically and triggers a recursive evaluation on their values.
 * 4. Primitives: If `T` is a primitive, it returns the value safely unchanged.
 */
export type DeepReadonly<T> = T extends Date | RegExp | Map<any, any> | Set<any>
  ? T
  : T extends any[]
    ? ReadonlyArray<DeepReadonly<T[number]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
