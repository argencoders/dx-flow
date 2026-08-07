import { TypeError } from "../core/errors.types.js";
import { IsPlainArray } from "./state-discriminators.js";
import { DefaultStateValue } from "./state-values.js";

type ERR_VALOR_PROHIBIDO =
  TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

/**
 * Validador unitario y aislado para estructuras de listas (Arreglos mutables e inmutables).
 * - Inspecciona que los elementos internos cumplan con TValue.
 * - Si AllowArrays es false, bloquea cualquier array de forma inmediata.
 */
export type CheckArrayLeaf<
  T,
  TValue = DefaultStateValue,
  AllowArrays extends boolean = true,
> =
  IsPlainArray<T> extends true
    ? AllowArrays extends false
      ? ERR_VALOR_PROHIBIDO
      : T extends (infer U)[]
        ? U extends TValue
          ? T
          : ERR_VALOR_PROHIBIDO
        : T extends ReadonlyArray<infer RU>
          ? RU extends TValue
            ? T
            : ERR_VALOR_PROHIBIDO
          : T
    : T; // Si no es un array, lo deja pasar intacto para otra capa
