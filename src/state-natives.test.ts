import { test } from "node:test";
import { Expect, TypeError } from "./types-testing.js";
import { CheckNativeLeaf } from "./state-natives.js";

type ERR_VALOR_PROHIBIDO =
  TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

test("Profundidad: Validación atómica de Hojas Nativas", () => {
  function testFlujoPorDefecto() {
    // ✅ REQUISITO: Bajo la configuración por defecto, Date debe ser completamente válido
    type TestDateOk = Expect<CheckNativeLeaf<Date>, Date>;

    // ✅ REQUISITO: Si el tipo analizado es un string primitivo, debe pasar intacto sin alterarse
    type TestStringIgnorado = Expect<CheckNativeLeaf<string>, string>;
  }

  function testFlujoConExclusion() {
    // Creamos un criterio de valores estricto donde prohibimos explícitamente instancias de Date
    type SoloStringsYNumeros = string | number;

    // ❌ REQUISITO: El validador debe detectar que Date no pertenece al criterio y devolver el token
    type ResultadoDateProhibido = CheckNativeLeaf<Date, SoloStringsYNumeros>;
    type TestDateCustom = Expect<ResultadoDateProhibido, ERR_VALOR_PROHIBIDO>;

    // ✅ REQUISITO: Un string bajo este mismo criterio personalizado debe seguir pasando limpio
    type ResultadoStringCustom = CheckNativeLeaf<string, SoloStringsYNumeros>;
    type TestStringCustom = Expect<ResultadoStringCustom, string>;
  }
});
