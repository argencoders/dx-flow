/**
 * Utilitario interno para restar un nivel (un elemento) a una tupla de TypeScript.
 */
export type Decrement<N extends any[]> = N extends [any, ...infer Rest]
  ? Rest
  : [];

/**
 * Convierte un número entero plano en una tupla iterable de longitud N.
 * Ejemplo: Enumerate<3> resuelve a [any, any, any] (longitud 3).
 */
export type Enumerate<
  N extends number,
  Acc extends any[] = [],
> = Acc["length"] extends N ? Acc : Enumerate<N, [any, ...Acc]>;
