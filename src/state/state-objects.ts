import { TypeError } from "../core/errors.types.js";
import { IsPlainObject } from "./state-discriminators.js";
import { Decrement } from "./state-counter.js";
import {
  ValidateObjectKeys,
  ValidatorStrategy,
} from "../nomenclature/object-keys.js";

export type ERR_PROFUNDIDAD_EXCEDIDA =
  TypeError<"❌ ERROR: La estructura del estado supera el límite de profundidad (MaxLevel) permitido.">;
export type ERR_LLAVES_INVALIDAS_INTERNAS =
  TypeError<"❌ ERROR: Se detectaron llaves que violan la convención de nomenclatura configurada.">;

/**
 * Validador recursivo unitario para estructuras de objetos planos anidados.
 */
export type CheckObjectDeep<
  T,
  LevelCounter extends any[],
  TStrategy extends ValidatorStrategy = "default", // 💡 Inyección de tu estrategia por defecto
> =
  IsPlainObject<T> extends true
    ? LevelCounter["length"] extends 0
      ? ERR_PROFUNDIDAD_EXCEDIDA
      : // 🎯 Evaluamos si las llaves superficiales de este nivel cumplen con la estrategia activa
        ValidateObjectKeys<T, TStrategy> extends TypeError<any>
        ? ERR_LLAVES_INVALIDAS_INTERNAS
        : false extends {
              [K in keyof T]: CheckObjectDeep<
                T[K],
                Decrement<LevelCounter>,
                TStrategy
              > extends TypeError<any>
                ? false
                : true;
            }[keyof T]
          ? {
              [K in keyof T]: CheckObjectDeep<
                T[K],
                Decrement<LevelCounter>,
                TStrategy
              >;
            }[keyof T] &
              TypeError<any>
          : T
    : T;
