/**
 * Determina de forma estricta si un tipo es un objeto plano de datos (Literal / DTO).
 * - Devuelve `true` si es una estructura de datos pura `{}`.
 * - Devuelve `false` para primitivos, funciones, arreglos y objetos nativos del sistema.
 */
export type IsPlainObject<T> = T extends (...args: any[]) => any
  ? false
  : T extends Date | RegExp | Map<any, any> | Set<any>
    ? false
    : T extends any[]
      ? false
      : T extends object
        ? true
        : false;

/**
 * Determina de forma estricta si un tipo es un arreglo plano de datos.
 * - Devuelve `true` si es una lista indexada nativa (`any[]` o `ReadonlyArray`).
 * - Devuelve `false` para objetos, funciones y tipos primitivos.
 */
export type IsPlainArray<T> = T extends any[]
  ? true
  : T extends ReadonlyArray<any>
    ? true
    : false;

/**
 * Inspecciona las llaves superficiales de un tipo estructural.
 * - Devuelve `true` si todas las llaves extienden a `AllowedKeyType`.
 * - Devuelve `false` si se detecta alguna llave fuera del criterio (ej: un Symbol).
 */
export type ValidateKeys<
  T,
  AllowedKeyType = string,
> = keyof T extends AllowedKeyType ? true : false;
