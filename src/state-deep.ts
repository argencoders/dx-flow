import { TypeError } from "./types-testing.js";
import { IsPlainObject, IsPlainArray } from "./state-discriminators.js";
import { DefaultStateValue } from "./state-values.js";
import { DefaultStateKey } from "./state-keys.js";
import { CheckStateShallow } from "./state-shallow.js";
import { Enumerate } from "./state-counter.js";
import { CheckNativeLeaf } from "./state-natives.js";
import { CheckArrayLeaf } from "./state-arrays.js";
import { CheckObjectDeep } from "./state-objects.js";

/**
 * Pipeline central recursivo que coordina todos los validadores atómicos certificados.
 */
type CheckStateDeepInternal<
  T,
  TKey extends string | number | symbol,
  TValue,
  AllowArrays extends boolean,
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
              TKey,
              TValue,
              AllowArrays,
              LevelCounter
            > extends TypeError<any>
            ? CheckStateDeepInternal<U, TKey, TValue, AllowArrays, LevelCounter>
            : T
          : T extends ReadonlyArray<infer RU>
            ? CheckStateDeepInternal<
                RU,
                TKey,
                TValue,
                AllowArrays,
                LevelCounter
              > extends TypeError<any>
              ? CheckStateDeepInternal<
                  RU,
                  TKey,
                  TValue,
                  AllowArrays,
                  LevelCounter
                >
              : T
            : T
        : CheckObjectDeep<T, TKey, LevelCounter> extends TypeError<any>
          ? CheckObjectDeep<T, TKey, LevelCounter>
          : IsPlainObject<T> extends true
            ? false extends {
                [K in keyof T]: CheckStateDeepInternal<
                  T[K],
                  TKey,
                  TValue,
                  AllowArrays,
                  LevelCounter
                > extends TypeError<any>
                  ? false
                  : true;
              }[keyof T]
              ? {
                  [K in keyof T]: CheckStateDeepInternal<
                    T[K],
                    TKey,
                    TValue,
                    AllowArrays,
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
  TKey extends string | number | symbol = DefaultStateKey,
  TValue = DefaultStateValue,
  AllowArrays extends boolean = true,
  MaxLevel extends number = 2,
> =
  CheckStateShallow<T, TKey, TValue, AllowArrays> extends TypeError<any>
    ? CheckStateShallow<T, TKey, TValue, AllowArrays>
    : CheckStateDeepInternal<T, TKey, TValue, AllowArrays, Enumerate<MaxLevel>>; // ✅ Simplificado: El pipeline fluye sin guardianes rotos
