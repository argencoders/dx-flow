import { test } from "node:test";
import { Result } from "./result.js";

test("Workflow - Result: Validación estática de asignación", () => {
  function testFlujosPositivos() {
    type RespuestaOperacion = Result<
      { transaccionId: string },
      "FONDO_INSUFICIENTE"
    >;

    // ✅ REQUISITO: Un objeto de éxito puro debe encajar perfectamente en la mónada
    const exito: RespuestaOperacion = {
      success: true,
      data: { transaccionId: "tx_999" },
    };

    // ✅ REQUISITO: Un objeto de fallo puro con el string exacto debe encajar perfectamente
    const fallo: RespuestaOperacion = {
      success: false,
      error: "FONDO_INSUFICIENTE",
    };
  }

  function testFlujosNegativos() {
    type RespuestaOperacion = Result<
      { transaccionId: string },
      "FONDO_INSUFICIENTE"
    >;

    // ❌ REQUISITO: Intentar mezclar 'data' en un bloque de 'success: false' debe ser ilegal
    // @ts-expect-error
    const falloInvalido: RespuestaOperacion = {
      success: false,
      data: { transaccionId: "tx_123" },
      error: "FONDO_INSUFICIENTE",
    };

    // ❌ REQUISITO: Intentar usar un código de error que no está en la unión declarada debe fallar
    const errorInvalido: RespuestaOperacion = {
      success: false,
      // @ts-expect-error
      error: "ERROR_DE_SISTEMA_NO_DECLARADO",
    };
  }
});
