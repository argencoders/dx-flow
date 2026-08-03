import { test } from "node:test";
import { Expect } from "../../core/types-testing.js";
import { defineWorkflow } from "./factory.js";

interface EstadoSimulado {
  intentos: number;
  nombre: string;
  esVip: boolean;
}
const serviciosMock = {
  "pasarela.cobrar": async (ctx: any) => ({ success: true, data: {} }),
};

interface MutacionesSimuladas {
  INCREMENTAR_INTENTOS: (state: EstadoSimulado, payload: unknown) => any;
  CAMBIAR_NOMBRE: (state: EstadoSimulado, nuevoNombre: string) => any;
}

const workflow = defineWorkflow<
  EstadoSimulado,
  typeof serviciosMock,
  MutacionesSimuladas
>();

test("Workflow - Factory: Escenarios de Éxito e Inferencia de Grafos Multinodo", () => {
  function testFlujoCompletoPerfecto() {
    const miGrafo = workflow.create({
      id: "cobro_recurrente_v2",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate("INCREMENTAR_INTENTOS");
            ctx.mutate("CAMBIAR_NOMBRE", "Juan");
          },
          onSuccess: "evaluar_reintento",
        },
        intentar_cobro: {
          type: "action",
          action: async (state, ctx) => {
            if (state.intentos > 3) {
              return "FONDOS_INSUFICIENTES";
            }
          },
          onSuccess: "pausa",
          onError: {
            FONDOS_INSUFICIENTES: "evaluar_reintento",
          },
        },
        evaluar_reintento: {
          type: "choose",
          choices: [
            {
              condition: (state) => state.esVip,
              nextNode: "intentar_cobro",
            },
          ],
          otherwise: "fin_fallo",
        },
        pausa: {
          type: "delay",
          durationMs: 1000,
          onTimeout: "esperar_confirmacion",
        },
        esperar_confirmacion: {
          type: "action",
          action: (state, ctx) => {
            if (!ctx.signalPayload) {
              return ctx.suspend("INCREMENTAR_INTENTOS");
            }
          },
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
        fin_fallo: { type: "end", status: "FAILED" },
      },
    });

    type TestAsignabilidad = Expect<typeof miGrafo, typeof miGrafo>;
  }

  function testFlujoConNodosCompuestosFase5() {
    const miGrafoCompuesto = workflow.create({
      id: "flujo_compuesto_fase_5",
      nodes: {
        start: {
          type: "sequence",
          steps: ["paso_1", "paso_2"],
          onSuccess: "bucle_reintentos",
        },
        paso_1: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate("INCREMENTAR_INTENTOS");
          },
          onSuccess: "paso_2",
        },
        paso_2: {
          type: "delay",
          durationMs: 100,
          onTimeout: "bucle_reintentos",
        },
        bucle_reintentos: {
          type: "repeat",
          target: "paso_1",
          until: (state) => state.intentos >= 3,
          count: 5,
          onSuccess: "ejecucion_paralela",
        },
        ejecucion_paralela: {
          type: "parallel",
          branches: ["paso_1", "paso_2"],
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<typeof miGrafoCompuesto, typeof miGrafoCompuesto>;
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
          // @ts-expect-error - ❌ El error saltará aquí por apuntar a un nodo fantasma
          onTimeout: "NODO_FANTASMA_QUE_NO_EXISTE",
        },
      },
    });
  }

  function testFalloSequencePasosInexistentes() {
    workflow.create({
      id: "sequence_pasos_rotos",
      nodes: {
        start: {
          type: "sequence",
          // @ts-expect-error - ❌ Paso fantasma en steps
          steps: ["paso_existente", "paso_fantasma"],
          onSuccess: "fin",
        },
        paso_existente: { type: "end", status: "OK" },
        fin: { type: "end", status: "DONE" },
      },
    });
  }

  function testFalloRepeatTargetInexistente() {
    workflow.create({
      id: "repeat_target_roto",
      nodes: {
        start: {
          type: "repeat",
          // @ts-expect-error - ❌ Target fantasma en repeat
          target: "nodo_que_no_existe",
          onSuccess: "fin",
        },
        fin: { type: "end", status: "DONE" },
      },
    });
  }

  function testFalloParallelRamasInexistentes() {
    workflow.create({
      id: "parallel_rama_rota",
      nodes: {
        start: {
          type: "parallel",
          // @ts-expect-error - ❌ Rama fantasma en branches
          branches: ["nodo_fantasma"],
          onSuccess: "fin",
        },
        fin: { type: "end", status: "DONE" },
      },
    });
  }

  function testFalloTipoNodoInvalido() {
    workflow.create({
      id: "nodo_invalido",
      nodes: {
        start: {
          // @ts-expect-error - ❌ El error saltará aquí por tipo de nodo inexistente
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
            // @ts-expect-error - ❌ El error saltará aquí por payload de tipo erróneo
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
            // @ts-expect-error - ❌ El error saltará aquí por llave de mutación inexistente
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
        // @ts-expect-error - ❌ Retorna "ERROR_PASARELA" que no pertenece a las llaves de onError
        start: {
          type: "action",
          action: (state, ctx) => {
            return "ERROR_PASARELA";
          },
          onSuccess: "start",
          onError: {},
        },
      },
    });
  }
});
