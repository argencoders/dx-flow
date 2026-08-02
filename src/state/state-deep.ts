import { TypeError } from "../core/types-testing.js";
import { IsPlainObject, IsPlainArray } from "./state-discriminators.js";
import { DefaultStateValue } from "./state-values.js";
import {
  ValidatorStrategy,
  ValidateObjectKeys,
} from "../nomenclature/object-keys.js";
import { Enumerate } from "./state-counter.js";
import { CheckNativeLeaf } from "./state-natives.js";
import { CheckArrayLeaf } from "./state-arrays.js";
import { CheckObjectDeep } from "./state-objects.js";

/**
 * Pipeline central recursivo que coordina todos los validadores atómicos certificados.
 */
type CheckStateDeepInternal<
  T,
  TValue,
  AllowArrays extends boolean,
  TCasing extends ValidatorStrategy,
  LevelCounter extends any[],
> = T extends (...args: any[]) => any
  ? TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">
  : CheckNativeLeaf<T, TValue> extends TypeError<any>
    ? CheckNativeLeaf<T, TValue>
    : CheckArrayLeaf<T, TValue, AllowArrays> extends TypeError<any>
      ? CheckArrayLeaf<T, TValue, AllowArrays>
      : IsPlainArray<T> extends true
        ? T extends (infer U)[]
          ? CheckStateDeepInternal<
              U,
              TValue,
              AllowArrays,
              TCasing,
              LevelCounter
            > extends TypeError<any>
            ? CheckStateDeepInternal<
                U,
                TValue,
                AllowArrays,
                TCasing,
                LevelCounter
              >
            : T
          : T extends ReadonlyArray<infer RU>
            ? CheckStateDeepInternal<
                RU,
                TValue,
                AllowArrays,
                TCasing,
                LevelCounter
              > extends TypeError<any>
              ? CheckStateDeepInternal<
                  RU,
                  TValue,
                  AllowArrays,
                  TCasing,
                  LevelCounter
                >
              : T
            : T
        : // 🎯 Pasamos la estrategia elegida al motor de objetos
          CheckObjectDeep<T, LevelCounter, TCasing> extends TypeError<any>
          ? CheckObjectDeep<T, LevelCounter, TCasing>
          : IsPlainObject<T> extends true
            ? false extends {
                [K in keyof T]: CheckStateDeepInternal<
                  T[K],
                  TValue,
                  AllowArrays,
                  TCasing,
                  LevelCounter
                > extends TypeError<any>
                  ? false
                  : true;
              }[keyof T]
              ? {
                  [K in keyof T]: CheckStateDeepInternal<
                    T[K],
                    TValue,
                    AllowArrays,
                    TCasing,
                    LevelCounter
                  >;
                }[keyof T] &
                  TypeError<any>
              : T
            : T extends TValue
              ? T
              : TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

/**
 * Validador de estructuras de estado definitivo, configurable y de alta precisión.
 */
export type IsValidState<
  T,
  TValue = DefaultStateValue,
  AllowArrays extends boolean = true,
  TCasing extends ValidatorStrategy = "default", // 💡 Reemplaza a TKey de forma limpia
  MaxLevel extends number = 2,
> =
  // 🎯 Validamos la raíz del estado usando la estrategia elegida
  ValidateObjectKeys<T, TCasing> extends TypeError<any>
    ? ValidateObjectKeys<T, TCasing>
    : CheckStateDeepInternal<
        T,
        TValue,
        AllowArrays,
        TCasing,
        Enumerate<MaxLevel>
      >;
