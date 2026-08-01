import { TypeError } from "./types-testing.js";
import {
  IsPlainObject,
  IsPlainArray,
  ValidateKeys,
} from "./state-discriminators.js";

// Diccionario centralizado de errores semánticos para el desarrollador
export type ERR_RAIZ_DEBE_SER_OBJETO =
  TypeError<"❌ ERROR: La raíz del estado debe ser estrictamente un objeto plano de datos (DTO).">;
export type ERR_ARREGLOS_PROHIBIDOS =
  TypeError<"❌ ERROR: Los arreglos están prohibidos en la raíz bajo la configuración actual.">;
export type ERR_LLAVES_INVALIDAS =
  TypeError<"❌ ERROR: Se detectaron llaves que violan la restricción de nomenclatura permitida.">;

/**
 * Validador superficial (Nivel 1) de estructuras de estado.
 * Ensambla los discriminadores atómicos para validar la raíz del estado.
 */
export type CheckStateShallow<
  T,
  TKey extends string | number | symbol,
  TValue,
  AllowArrays extends boolean,
> =
  // 1. Si es una función o un primitivo suelto, falla inmediatamente exigiendo un objeto
  T extends (...args: any[]) => any
    ? ERR_RAIZ_DEBE_SER_OBJETO
    : IsPlainArray<T> extends true
      ? AllowArrays extends false
        ? ERR_ARREGLOS_PROHIBIDOS
        : T // Si se permiten arreglos, la raíz es formalmente válida en nivel 1
      : IsPlainObject<T> extends false
        ? ERR_RAIZ_DEBE_SER_OBJETO
        : ValidateKeys<T, TKey> extends false
          ? ERR_LLAVES_INVALIDAS
          : T; // Si supera todas las pruebas superficiales, retorna la estructura intacta
