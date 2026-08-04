import { test } from "node:test";
import assert from "node:assert/strict";
import { Expect } from "../../core/types-testing.js";
import { defineWorkflow, WorkflowGraph, resolveStartNodeId } from "./factory.js";

interface EstadoSimulado {
  intentos: number;
  nombre: string;
  esVip: boolean;
}
const serviciosMock = {
  "pasarela.cobrar": async (ctx: any) => ({ success: true, data: {} }),
};

const workflow = defineWorkflow<EstadoSimulado, typeof serviciosMock>();

test("Workflow - Factory: Escenarios de Éxito e Inferencia de Grafos Multinodo", () => {
  function testFlujoCompletoPerfecto() {
    const miGrafo = workflow.create({
      id: "cobro_recurrente_v2",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
            ctx.mutate({ nombre: "Juan" });
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
              return ctx.suspend("esperar_confirmacion");
            }
          },
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
        fin_fallo: { type: "end", status: "FAILED" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafo,
      WorkflowGraph<
        EstadoSimulado,
        typeof serviciosMock,
        | "start"
        | "intentar_cobro"
        | "evaluar_reintento"
        | "pausa"
        | "esperar_confirmacion"
        | "fin_exito"
        | "fin_fallo"
      >
    >;
  }

  function testFlujoConNodosCompuestosFase5() {
    const miGrafoCompuesto = workflow.create({
      id: "flujo_compuesto_fase_5",
      nodes: {
        start: {
          type: "sequence",
          steps: [
            (state, ctx) => {
              ctx.mutate({ intentos: state.intentos + 1 });
            },
            {
              type: "delay",
              durationMs: 100,
            },
          ],
          onSuccess: "bucle_reintentos",
        },
        paso_1: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
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

    type TestAsignabilidad = Expect<
      typeof miGrafoCompuesto,
      WorkflowGraph<
        EstadoSimulado,
        typeof serviciosMock,
        | "start"
        | "paso_1"
        | "paso_2"
        | "bucle_reintentos"
        | "ejecucion_paralela"
        | "fin_exito"
      >
    >;
  }

  function testNodeBuilderSintaxisLimpia() {
    const { node, create } = defineWorkflow<EstadoSimulado, typeof serviciosMock>();

    const miGrafoTradicional = create({
      id: "flujo_demostracion",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          onSuccess: "pausa_espera",
        },
        pausa_espera: {
          type: "delay",
          durationMs: 500,
          onTimeout: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    const miGrafoConNodeBuilders = create({
      id: "flujo_demostracion",
      nodes: {
        start: node.action({
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          onSuccess: "pausa_espera",
        }),
        pausa_espera: node.delay({
          durationMs: 500,
          onTimeout: "fin_exito",
        }),
        fin_exito: node.end({ status: "SUCCESS" }),
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoConNodeBuilders,
      typeof miGrafoTradicional
    >;
  }

  function testFlujoSequencePasosInline() {
    const miGrafoSequenceInline = workflow.create({
      id: "flujo_sequence_inline",
      nodes: {
        start: {
          type: "sequence",
          steps: [
            // 1. Shorthand action callback
            (state, ctx) => {
              ctx.mutate({ intentos: state.intentos + 1 });
            },
            // 2. Action inline con onError opcional
            {
              type: "action",
              action: (state, ctx) => {
                if (state.intentos > 5) return "LIMITE_EXCEDIDO";
                ctx.mutate({ nombre: "Carlos" });
              },
              onError: {
                LIMITE_EXCEDIDO: "fin_fallo",
              },
            },
            // 3. Delay inline
            {
              type: "delay",
              durationMs: 500,
            },
            // 4. Choose inline sin otherwise (fallthrough implícito)
            {
              type: "choose",
              choices: [
                {
                  condition: (state) => state.esVip,
                  nextNode: "fin_exito",
                },
              ],
            },
          ],
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
        fin_fallo: { type: "end", status: "FAILED" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoSequenceInline,
      WorkflowGraph<
        EstadoSimulado,
        typeof serviciosMock,
        "start" | "fin_exito" | "fin_fallo"
      >
    >;
  }

  function testFlujoRepeatPasosInline() {
    const miGrafoRepeatInline = workflow.create({
      id: "flujo_repeat_inline",
      nodes: {
        start: {
          type: "repeat",
          steps: [
            (state, ctx) => {
              ctx.mutate({ intentos: state.intentos + 1 });
            },
            {
              type: "delay",
              durationMs: 100,
            },
          ],
          until: (state) => state.intentos >= 3,
          count: 5,
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoRepeatInline,
      WorkflowGraph<EstadoSimulado, typeof serviciosMock, "start" | "fin_exito">
    >;
  }

  function testFlujoParallelRamasInline() {
    const miGrafoParallelInline = workflow.create({
      id: "flujo_parallel_inline",
      nodes: {
        start: {
          type: "parallel",
          branches: [
            // Rama 1: Shorthand callback
            (state, ctx) => {
              ctx.mutate({ intentos: state.intentos + 1 });
            },
            // Rama 2: Paso delay inline
            {
              type: "delay",
              durationMs: 100,
            },
          ],
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoParallelInline,
      WorkflowGraph<EstadoSimulado, typeof serviciosMock, "start" | "fin_exito">
    >;
  }

  function testFlujoConRetryPolicyValida() {
    const miGrafoRetry = workflow.create({
      id: "flujo_retry_valido",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          retry: {
            maxAttempts: 3,
            initialIntervalMs: 1000,
            backoffCoefficient: 2,
            maxIntervalMs: 10000,
            jitter: true,
            retryableErrors: ["TIMEOUT"],
          },
          onSuccess: "paso_inline",
        },
        paso_inline: {
          type: "sequence",
          steps: [
            {
              type: "action",
              action: (state, ctx) => {
                ctx.mutate({ intentos: state.intentos + 1 });
              },
              retry: {
                maxAttempts: 2,
                initialIntervalMs: 500,
              },
            },
          ],
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoRetry,
      WorkflowGraph<
        EstadoSimulado,
        typeof serviciosMock,
        "start" | "paso_inline" | "fin_exito"
      >
    >;
  }

  function testFlujoSagaConCompensacionesValidas() {
    const miGrafoSaga = workflow.create({
      id: "flujo_saga_valido",
      nodes: {
        reservar_stock: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          compensate: (state, ctx) => {
            ctx.mutate({ nombre: "ROLLED_BACK" });
          },
          onSuccess: "pasos_secuencia",
        },
        pasos_secuencia: {
          type: "sequence",
          steps: [
            {
              type: "action",
              action: (state, ctx) => {
                ctx.mutate({ nombre: "PasoCobro" });
              },
              compensate: async (state, ctx) => {
                ctx.mutate({ nombre: "CobroReembolsado" });
              },
            },
          ],
          onSuccess: "fin_exito",
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoSaga,
      WorkflowGraph<
        EstadoSimulado,
        typeof serviciosMock,
        "reservar_stock" | "pasos_secuencia" | "fin_exito"
      >
    >;
  }

  function testFlujoConNodoEndResultExplicit() {
    const miGrafoResult = workflow.create({
      id: "flujo_end_result",
      nodes: {
        start: {
          type: "action",
          action: () => {},
          onSuccess: "fin_error",
        },
        fin_error: {
          type: "end",
          status: "PAYMENT_FAILED",
          result: "error",
        },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoResult,
      WorkflowGraph<EstadoSimulado, typeof serviciosMock, "start" | "fin_error">
    >;
  }

  function testFlujoSubworkflowValido() {
    const subGrafo = workflow.create({
      id: "sub_flujo",
      nodes: {
        paso_sub: {
          type: "action",
          action: (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          onSuccess: "fin_sub",
        },
        fin_sub: { type: "end", status: "SUB_DONE" },
      },
    });

    const miGrafoSubworkflow = workflow.create({
      id: "flujo_con_subworkflow",
      nodes: {
        start: {
          type: "subworkflow",
          workflow: subGrafo,
          input: (state) => ({ intentos: state.intentos, nombre: state.nombre, esVip: state.esVip }),
          output: (ctx, subState) => {
            ctx.mutate({ intentos: subState.intentos });
          },
          compensate: (state, ctx) => {
            ctx.mutate({ nombre: "SUB_COMPENSATED" });
          },
          onSuccess: "fin_exito",
          onError: {
            SUB_ERROR: "fin_exito",
          },
        },
        fin_exito: { type: "end", status: "SUCCESS" },
      },
    });

    type TestAsignabilidad = Expect<
      typeof miGrafoSubworkflow,
      WorkflowGraph<EstadoSimulado, typeof serviciosMock, "start" | "fin_exito">
    >;
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
          branches: [
            // @ts-expect-error - ❌ Rama fantasma en branches
            "nodo_fantasma",
          ],
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
            // @ts-expect-error - ❌ Tipo incorrecto para el campo 'nombre' (espera string, recibe number)
            ctx.mutate({ nombre: 12345 });
          },
          onSuccess: "start",
        },
      },
    });
  }

  function testFalloMutacionInexistenteEnAction() {
    workflow.create({
      id: "campo_roto",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {
            // @ts-expect-error - ❌ Campo que no existe en TState
            ctx.mutate({ campoQueNoExisteEnEstado: true });
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

  function testFalloErrorNoMapeadoEnPasoInlineAction() {
    workflow.create({
      id: "error_inline_sin_mapear",
      nodes: {
        start: {
          type: "sequence",
          steps: [
            // @ts-expect-error - ❌ Retorna "ERROR_INLINE_UNMAPPED" que no está declarado en onError
            {
              type: "action",
              action: (state, ctx) => {
                return "ERROR_INLINE_UNMAPPED";
              },
              onError: {
                OTRO_ERROR: "fin",
              },
            },
          ],
          onSuccess: "fin",
        },
        fin: { type: "end", status: "OK" },
      },
    });
  }

  function testFalloShorthandCallbackRetornaError() {
    workflow.create({
      id: "shorthand_retorna_error",
      nodes: {
        start: {
          type: "sequence",
          steps: [
            // @ts-expect-error - ❌ Shorthand function no puede retornar código de error
            (state, ctx) => {
              return "ERROR_EN_SHORTHAND";
            },
          ],
          onSuccess: "fin",
        },
        fin: { type: "end", status: "OK" },
      },
    });
  }

  function testFalloRetryPolicyInvalida() {
    workflow.create({
      id: "retry_invalido",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {},
          retry: {
            // @ts-expect-error - ❌ maxAttempts debe ser un number, no string
            maxAttempts: "TRES",
            initialIntervalMs: 1000,
          },
          onSuccess: "fin",
        },
        fin: { type: "end", status: "OK" },
      },
    });
  }

  function testFalloCompensateMutacionInexistente() {
    workflow.create({
      id: "compensate_mutacion_invalida",
      nodes: {
        start: {
          type: "action",
          action: (state, ctx) => {},
          compensate: (state, ctx) => {
            // @ts-expect-error - ❌ Campo invalido que no existe en TState
            ctx.mutate({ campoInexistenteEnCompensate: 123 });
          },
          onSuccess: "fin",
        },
        fin: { type: "end", status: "OK" },
      },
    });
  }

  function testFalloNodoEndResultInvalido() {
    workflow.create({
      id: "end_result_invalido",
      nodes: {
        fin: {
          type: "end",
          status: "OK",
          // @ts-expect-error - ❌ Valor no permitido en enum de result
          result: "CATEGORIA_INVENTADA",
        },
      },
    });
  }

  function testFalloSubworkflowOnSuccessInexistente() {
    const subGrafo = workflow.create({
      id: "sub_flujo_err",
      nodes: {
        fin_sub: { type: "end", status: "DONE" },
      },
    });

    workflow.create({
      id: "subworkflow_enlace_roto",
      nodes: {
        start: {
          type: "subworkflow",
          workflow: subGrafo,
          // @ts-expect-error - ❌ onSuccess apunta a un nodo fantasma
          onSuccess: "NODO_FANTASMA_PADRE",
        },
      },
    });
  }
});

test("Workflow - Factory: Inferencia del nodo inicial (resolveStartNodeId)", () => {
  // 1. Objeto de nodos vacío o indefinido
  assert.equal(resolveStartNodeId({}), undefined);
  assert.equal(resolveStartNodeId(undefined as any), undefined);

  // 2. Prioridad Explícita: Retorna el explicitStartNodeId especificado si existe
  const nodesMultinodo = {
    primer_nodo: { type: "action" },
    start: { type: "action" },
    nodo_custom: { type: "end" },
  };
  assert.equal(resolveStartNodeId(nodesMultinodo, "nodo_custom"), "nodo_custom");

  // 3. Prioridad por Clave 'start': Selecciona 'start' si no hay un explicitStartNodeId
  assert.equal(resolveStartNodeId(nodesMultinodo), "start");

  // 4. Fallback por Orden de Inserción: Selecciona la primera llave declarada si no existe 'start' ni explicitStartNodeId
  const nodesSinStartKey = {
    primer_paso: { type: "action" },
    segundo_paso: { type: "end" },
  };
  assert.equal(resolveStartNodeId(nodesSinStartKey), "primer_paso");
});

