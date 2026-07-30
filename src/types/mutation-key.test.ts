import { test } from "node:test";
import { MutationKey } from "./mutation-key.js";

/**
 * Auxiliar de Aserción para Llaves de Mutación.
 * Si el string K es válido para MutationKey, devuelve K. Si no, devuelve never.
 */
type AssertValidKey<K extends expected, expected = MutationKey<K>> = K;

test("Verificación estática de tipos para MutationKey", () => {
  // Estas funciones no se ejecutan. El compilador TS validará los tipos en el editor.

  function flujoPositivo() {
    // Casos válidos: Deben compilar limpiamente sin emitir errores
    type OK1 = AssertValidKey<"STARTED">;
    type OK2 = AssertValidKey<"COBRO_FALLIDO">;
    type OK3 = AssertValidKey<"PROCESO_FINALIZADO_OK">;
  }

  function flujoNegativo() {
    // @ts-expect-error - ERROR: No se permiten letras minúsculas
    type ErrMinuscula = AssertValidKey<"cobro_fallido">;

    // @ts-expect-error - ERROR: No se permite guion bajo al principio
    type ErrGuionInicio = AssertValidKey<"_STARTED">;

    // @ts-expect-error - ERROR: No se permite guion bajo al final
    type ErrGuionFinal = AssertValidKey<"STARTED_">;

    // @ts-expect-error - ERROR: No se permiten múltiples guiones bajos seguidos
    type ErrGuionDoble = AssertValidKey<"COBRO__FALLIDO">;

    // @ts-expect-error - ERROR: No se permiten caracteres especiales ni números sueltos si así lo decides
    type ErrCaracteres = AssertValidKey<"COBRO-FALLIDO">;
  }
});
