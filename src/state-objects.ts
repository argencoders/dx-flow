import { TypeError } from "./types-testing.js";
import { IsPlainObject, ValidateKeys } from "./state-discriminators.js";
import { Decrement } from "./state-counter.js";

export type ERR_PROFUNDIDAD_EXCEDIDA =
  TypeError<"❌ ERROR: La estructura del estado supera el límite de profundidad (MaxLevel) permitido.">;
export type ERR_LLAVES_INVALIDAS_INTERNAS =
  TypeError<"❌ ERROR: Se detectaron llaves inválidas en los subniveles del estado.">;

/**
 * Validador recursivo unitario para estructuras de objetos planos anidados.
 * Controla estrictamente los límites de profundidad y nomenclatura de llaves internas.
 */
export type CheckObjectDeep<
  T,
  TKey extends string | number | symbol,
  LevelCounter extends any[],
> =
  IsPlainObject<T> extends true
    ? LevelCounter["length"] extends 0
      ? ERR_PROFUNDIDAD_EXCEDIDA // ❌ Error si es un objeto pero se agotaron los niveles permitidos
      : ValidateKeys<T, TKey> extends false
        ? ERR_LLAVES_INVALIDAS_INTERNAS
        : // Mapeamos y evaluamos homórficamente cada propiedad restando un nivel de profundidad
          false extends {
              [K in keyof T]: CheckObjectDeep<
                T[K],
                TKey,
                Decrement<LevelCounter>
              > extends TypeError<any>
                ? false
                : true;
            }[keyof T]
          ? // Si alguna propiedad profunda devolvió un error, extraemos y propagamos ese error exacto
            {
              [K in keyof T]: CheckObjectDeep<
                T[K],
                TKey,
                Decrement<LevelCounter>
              >;
            }[keyof T] &
              TypeError<any>
          : T
    : T; // Si no es un objeto (es un primitivo), pasa libre para que lo evalúe otra capa
