import { test } from "node:test";
import { ExpectEqual } from "../../core/testing.types.js";
import { defineWorkflow } from "./factory.js";

type NodosExistentes = "start" | "intentar_pago" | "fin_exito";
interface EstadoSimulado {
  intentos: number;
}
type ServiciosVacios = {};

// ============================================================================
// 🎯 PRUEBA DE FUEGO DE EXTENSIBILIDAD (Declaration Merging)
// ============================================================================

declare module "./validator.js" {
  interface NodeDefinitions<
    TState,
    TServices,
    TNodesList extends string,
    TEvents,
  > {
    webhook: {
      type: "webhook";
      url: string;
      onResponseOk: TNodesList;
    };
  }
}

// Inicializamos la factoría compartida para el test de validadores
const workflow = defineWorkflow<EstadoSimulado, ServiciosVacios>();

test("Workflow - Validator: Extensibilidad de fisonomías (Nodo Webhook)", () => {
  function testNodoInyectadoOk() {
    // ✅ REQUISITO: Un nodo inyectado con destinos correctos compila impecable en la factoría
    const miGrafo = workflow.create({
      id: "test_ext_ok",
      nodes: {
        disparar_alerta: {
          type: "webhook",
          url: "https://api.com",
          onResponseOk: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestOk = ExpectEqual<typeof miGrafo, typeof miGrafo>;
  }

  function testNodoInyectadoRoto() {
    workflow.create({
      id: "test_ext_roto",
      nodes: {
        disparar_alerta: {
          type: "webhook",
          url: "https://api.com",
          // @ts-expect-error
          onResponseOk: "NODO_FANTASMA_INEXISTENTE",
        },
      },
    });
  }
});
