/**
 * Versión optimizada para estructuras serializables.
 * - Si es un Array: Lo transforma en un ReadonlyArray recurriendo recursivamente sobre sus elementos.
 * - Si es un Objeto plano: Hace cada propiedad 'readonly' y recurre sobre sus tipos.
 * - Si es un Primitivo: Lo devuelve intacto.
 */
export type DeepReadonly<T> = T extends any[]
  ? ReadonlyArray<DeepReadonly<T[number]>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
