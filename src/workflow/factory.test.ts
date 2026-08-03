import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { defineWorkflow } from "./factory.js";

interface EstadoSimulado {
  intentos: number;
  nombre: string;
}
const registroMock = {
  "pasarela.cobrar": async (ctx: any) => ({ success: true, data: {} }),
};

interface MutacionesSimuladas {
  INCREMENTAR_INTENTOS: (state: EstadoSimulado, payload: unknown) => any;
  CAMBIAR_NOMBRE: (state: EstadoSimulado, nuevoNombre: string) => any;
}

const workflow = defineWorkflow<
  EstadoSimulado,
  typeof registroMock,
  MutacionesSimuladas
>();

test("Workflow - Factory: Escenarios de Éxito de Inferencia Completa", () => {
  function testFlujoPerfecto() {
    const miGrafo = workflow.create({
      id: "cobro_recurrente_v2",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate("INCREMENTAR_INTENTOS");
            ctx.mutate("CAMBIAR_NOMBRE", "Juan");
          },
          onSuccess: "pausa",
        },
        pausa: {
          type: "delay",
          durationMs: 1000,
          onTimeout: "fin",
        },
        fin: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<typeof miGrafo, typeof miGrafo>;
  }
});

test("Workflow - Factory: Escenarios de Fallo por Infracciones Lógicas", () => {
  function testFalloDestinoInexistente() {
    workflow.create({
      id: "enlace_roto",
      nodes: {
        start: {
          type: "delay",
          durationMs: 500,
          // @ts-expect-error - ❌ El error saltará aquí de forma precisa por apuntar a un nodo fantasma
          onTimeout: "NODO_FANTASMA_QUE_NO_EXISTE",
        },
      },
    });
  }

  function testFalloTipoNodoInvalido() {
    workflow.create({
      id: "nodo_invalido",
      nodes: {
        start: {
          // @ts-expect-error - ❌ El error saltará aquí de forma precisa por tipo de nodo inexistente
          type: "TIPO_DE_NODO_COMPLETAMENTE_FALSO",
        },
      },
    });
  }

  function testFalloMutacionErroneaEnAction() {
    workflow.create({
      id: "payload_roto",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            // @ts-expect-error - ❌ El error saltará aquí de forma precisa por payload de tipo erróneo
            ctx.mutate("CAMBIAR_NOMBRE", 12345);
          },
          onSuccess: "start",
        },
      },
    });
  }

  function testFalloMutacionInexistenteEnAction() {
    workflow.create({
      id: "key_rota",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            // @ts-expect-error - ❌ El error saltará aquí de forma precisa por llave de mutación inexistente
            ctx.mutate("MUTACION_QUE_NO_EXISTE");
          },
          onSuccess: "start",
        },
      },
    });
  }

  function testFalloErrorNoMapeadoEnAction() {
    workflow.create({
      id: "error_sin_mapear",
      nodes: {
        start: {
          type: "action",
          // @ts-expect-error - ❌ Falta declarar 'ERROR_PASARELA' en onError
          action: (state, ctx): "ERROR_PASARELA" | void => {
            return "ERROR_PASARELA";
          },
          onSuccess: "start",
          onError: {},
        },
      },
    });
  }
});
