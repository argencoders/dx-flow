import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { ValidateGraphNodes } from "./validator.js";

type NodosExistentes = "start" | "intentar_pago" | "fin_exito";
interface EstadoSimulado {
  intentos: number;
}
type RegistroVacio = {};

test("Workflow - Validator: Validación de nodos nativos base", () => {
  function testFlujoBase() {
    type NodosUsuario = {
      pausa: { type: "delay"; durationMs: 1000; onTimeout: "intentar_pago" };
      cierre: { type: "end"; status: "SUCCESS" };
    };

    type Resultado = ValidateGraphNodes<
      NodosUsuario,
      EstadoSimulado,
      RegistroVacio,
      NodosExistentes
    >;

    // ✅ REQUISITO: Al usar tipos nativos integrados del core, pasa la validación intacto
    type Test = Expect<Resultado, NodosUsuario>;
  }
});

// ============================================================================
// 🎯 PRUEBA DE FUEGO DE EXTENSIBILIDAD (Declaration Merging)
// ============================================================================

// Simulamos que el desarrollador inyecta un nodo tipo "webhook" personalizado en su app
declare module "./validator.js" {
  interface NodeDefinitions<TState, TRegistry, TNodesList extends string> {
    webhook: {
      type: "webhook";
      url: string;
      onResponseOk: TNodesList;
    };
  }
}

test("Workflow - Validator: Extensibilidad de fisonomías (Nodo Webhook)", () => {
  function testNodoInyectado() {
    type NodosConExtension = {
      disparar_alerta: {
        type: "webhook";
        url: "https://api.com";
        onResponseOk: "fin_exito";
      };
    };

    type Resultado = ValidateGraphNodes<
      NodosConExtension,
      EstadoSimulado,
      RegistroVacio,
      NodosExistentes
    >;

    // ✅ REQUISITO EXTRAORDINARIO: El validador asimila la extensión sin tocar el core de validator.ts
    type TestExtensionOk = Expect<Resultado, NodosConExtension>;
  }
});
