export type StateKey = string;

/**
 * Validador estricto de estructuras de estado.
 * Descarta funciones, arreglos y cualquier estructura cuyas llaves no extiendan a StateKey.
 */
export type IsValidState<T> = T extends (...args: any[]) => any
  ? never
  : T extends any[]
    ? never
    : keyof T extends StateKey
      ? T
      : never;
