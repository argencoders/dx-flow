import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { Result } from "./result.js";
import { ExtractActionErrors } from "./registry.js";

test("Workflow - Registry: Inferencia y extracción atómica de errores", () => {
  // 1. Simulamos un fragmento de tu registro de acciones reales del mundo real
  const registroAccionesSimuladas = {
    "pasarela.cobrar": async (context: {
      usuarioId: string;
      monto: number;
    }) => {
      // Retornamos un tipo explícito compatible con la mónada para la prueba de tipos
      return { success: false, error: "FONDO_INSUFICIENTE" as const } as Result<
        { transaccionId: string },
        "FONDO_INSUFICIENTE" | "TARJETA_EXPIRADA"
      >;
    },
    "notificaciones.enviar": async (context: { email: string }) => {
      return { success: true, data: { enviado: true } } as Result<
        { enviado: boolean },
        "EMAIL_INVALIDO"
      >;
    },
  };

  type MiRegistro = typeof registroAccionesSimuladas;

  function testInferenciaDeErrores() {
    // Extraemos los errores de la pasarela
    type ErroresCobro = ExtractActionErrors<MiRegistro, "pasarela.cobrar">;
    type ErroresEsperadosCobro = "FONDO_INSUFICIENTE" | "TARJETA_EXPIRADA";

    // ✅ REQUISITO: Debe extraer exactamente la unión de errores ignorando la promesa y el data de éxito
    type TestPasarela = Expect<ErroresCobro, ErroresEsperadosCobro>;

    // Extraemos los errores del nodo de notificaciones
    type ErroresNotif = ExtractActionErrors<
      MiRegistro,
      "notificaciones.enviar"
    >;

    // ✅ REQUISITO: Debe extraer el error único de forma fidedigna
    type TestNotificaciones = Expect<ErroresNotif, "EMAIL_INVALIDO">;
  }
});
