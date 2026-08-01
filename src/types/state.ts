export type DefaultStateKey = string;
export type DefaultStateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  | any[];

type Decrement<N extends any[]> = N extends [any, ...infer Rest] ? Rest : [];
type Enumerate<
  N extends number,
  Acc extends any[] = [],
> = Acc["length"] extends N ? Acc : Enumerate<N, [any, ...Acc]>;

/**
 * Evalúa recursivamente si la estructura es válida regresando un booleano puro.
 */
type CheckState<T, TKey, TValue, LevelCounter extends any[]> = T extends (
  ...args: any[]
) => any
  ? false // Las funciones están prohibidas siempre
  : T extends Date | RegExp | Map<any, any> | Set<any>
    ? true // Tipos nativos terminales aprobados directamente
    : T extends object
      ? LevelCounter["length"] extends 0
        ? false // ❌ CORRECCIÓN: Si es un objeto pero ya no quedan niveles permitidos, es inválido
        : keyof T extends TKey
          ? false extends {
              [K in keyof T]: CheckState<
                T[K],
                TKey,
                TValue,
                Decrement<LevelCounter>
              >;
            }[keyof T]
            ? false // Si alguna propiedad interna da false, todo el objeto es inválido
            : true
          : false
      : T extends TValue
        ? true // Primitivos que cumplen con el criterio
        : false;

export type IsValidState<
  T,
  TKey extends string | number | symbol = DefaultStateKey,
  TValue = DefaultStateValue,
  MaxLevel extends number = 2,
> = CheckState<T, TKey, TValue, Enumerate<MaxLevel>> extends true ? T : never;
