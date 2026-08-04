import { test } from "node:test";
import assert from "node:assert/strict";
import { executeWorkflow, resumeWorkflow } from "./engine.js";
import { defineWorkflow, WorkflowGraph } from "./factory.js";
import { createNodeHandlersRegistry } from "../handlers/node-handlers.js";
import { NodeHandler } from "./node-handler.js";

interface EstadoTest {
  contador: number;
  esVip: boolean;
  pagoRecibido: boolean;
}

interface ServicesTest {
  notificar: (mensaje: string) => void;
}

const wf = defineWorkflow<EstadoTest, ServicesTest>();

test("Workflow - Engine: Flujo Lineal Feliz (action -> delay -> end)", async () => {
  const graph = wf.create({
    id: "flujo_lineal",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate({ contador: state.contador + 1 });
        },
        onSuccess: "espera",
      },
      espera: {
        type: "delay",
        durationMs: 1000,
        onTimeout: "fin",
      },
      fin: {
        type: "end",
        status: "EXITO",
      },
    },
  });

  let msDemora = 0;
  let patchesRecibidos: Array<{ patch: Partial<EstadoTest>; newState: EstadoTest }> = [];

  const res = await executeWorkflow({
    graph,
    initialState: { contador: 0, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
    onMutation: (patch, newState) => {
      patchesRecibidos.push({ patch, newState: newState as EstadoTest });
    },
    delayFn: async (ms) => {
      msDemora = ms;
    },
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "EXITO");
    assert.equal(res.finalState.contador, 1);
    assert.equal(res.history.length, 3);
    assert.equal(res.history[0].nodeId, "start");
    assert.equal(res.history[1].nodeId, "espera");
    assert.equal(res.history[2].nodeId, "fin");
  }
  assert.equal(msDemora, 1000);
  assert.equal(patchesRecibidos.length, 1);
  assert.deepEqual(patchesRecibidos[0].patch, { contador: 1 });
  assert.equal(patchesRecibidos[0].newState.contador, 1);
});

test("Workflow - Engine: Flujo de Decisiones Ramificado (choose) y Manejo de Errores (onError)", async () => {
  const graph = wf.create({
    id: "flujo_decisiones",
    nodes: {
      start: {
        type: "action",
        action: (state) => {
          if (state.contador < 0) {
            return "VALOR_NEGATIVO";
          }
        },
        onSuccess: "evaluar",
        onError: {
          VALOR_NEGATIVO: "fin_error",
        },
      },
      evaluar: {
        type: "choose",
        choices: [
          {
            condition: (state) => state.esVip,
            nextNode: "fin_vip",
          },
        ],
        otherwise: "fin_estandar",
      },
      fin_vip: { type: "end", status: "VIP_COMPLETADO" },
      fin_estandar: { type: "end", status: "ESTANDAR_COMPLETADO" },
      fin_error: { type: "end", status: "ERROR_DENEGADO" },
    },
  });

  // 1. Camino VIP
  const resVip = await executeWorkflow({
    graph,
    initialState: { contador: 5, esVip: true, pagoRecibido: false },
    services: { notificar: () => {} },
  });
  assert.equal(resVip.status, "COMPLETED");
  if (resVip.status === "COMPLETED") {
    assert.equal(resVip.endStatus, "VIP_COMPLETADO");
  }

  // 2. Camino Estándar (otherwise)
  const resEstandar = await executeWorkflow({
    graph,
    initialState: { contador: 5, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
  });
  assert.equal(resEstandar.status, "COMPLETED");
  if (resEstandar.status === "COMPLETED") {
    assert.equal(resEstandar.endStatus, "ESTANDAR_COMPLETADO");
  }

  // 3. Camino Error Mapeado (onError)
  const resError = await executeWorkflow({
    graph,
    initialState: { contador: -1, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
  });
  assert.equal(resError.status, "COMPLETED");
  if (resError.status === "COMPLETED") {
    assert.equal(resError.endStatus, "ERROR_DENEGADO");
  }
});

test("Workflow - Engine: Ejecución Durable (Suspensión y Reanudación con resumeWorkflow)", async () => {
  // Handler custom que simula suspensión a la espera de un Webhook
  const suspendWebhookHandler: NodeHandler<EstadoTest, ServicesTest, any> =
    async () => {
      return {
        type: "SUSPEND",
        eventName: "WEBHOOK_CONFIRMACION_PAGO",
        targetOnResume: "procesar_confirmacion",
      };
    };

  const handlersCustom = createNodeHandlersRegistry<EstadoTest, ServicesTest, any>({
    wait_webhook: suspendWebhookHandler,
  });

  const graph = {
    id: "flujo_durable_webhook",
    nodes: {
      start: {
        type: "action",
        action: (state: EstadoTest, ctx: any) => {
          ctx.mutate({ contador: state.contador + 1 });
        },
        onSuccess: "esperar_pago",
      },
      esperar_pago: {
        type: "wait_webhook",
      },
      procesar_confirmacion: {
        type: "action",
        action: (state: EstadoTest, ctx: any) => {
          ctx.mutate({ pagoRecibido: true });
        },
        onSuccess: "fin_exito",
      },
      fin_exito: { type: "end", status: "PAGO_CONFIRMADO" },
    },
  } as WorkflowGraph<
    EstadoTest,
    ServicesTest,
    "start" | "esperar_pago" | "procesar_confirmacion" | "fin_exito"
  >;

  // 1. Primera Ejecución: Avanza de 'start' hasta 'esperar_pago' y se SUSPENDE
  const resInicial = await executeWorkflow({
    graph,
    initialState: { contador: 0, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
    handlers: handlersCustom,
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.suspendedAtNodeId, "esperar_pago");
    assert.equal(resInicial.targetOnResume, "procesar_confirmacion");
    assert.equal(resInicial.eventName, "WEBHOOK_CONFIRMACION_PAGO");
    assert.equal(resInicial.finalState.contador, 1);
    assert.equal(resInicial.finalState.pagoRecibido, false);
  }

  // 2. Reanudación (días después ante la llegada del webhook)
  if (resInicial.status === "SUSPENDED") {
    const resReanudado = await resumeWorkflow(resInicial, {
      graph,
      services: { notificar: () => {} },
      handlers: handlersCustom,
    });

    assert.equal(resReanudado.status, "COMPLETED");
    if (resReanudado.status === "COMPLETED") {
      assert.equal(resReanudado.endStatus, "PAGO_CONFIRMADO");
      assert.equal(resReanudado.finalState.contador, 1);
      assert.equal(resReanudado.finalState.pagoRecibido, true);
    }
  }
});

test("Workflow - Engine: Escenarios de Fallo de Runtime", async () => {
  const graphInvalido = {
    id: "grafo_invalido",
    nodes: {
      start: { type: "action", action: () => {}, onSuccess: "nodo_inexistente" },
    },
  };

  // 1. Nodo inexistente en medio de la transición
  await assert.rejects(
    async () => {
      await executeWorkflow({
        graph: graphInvalido,
        initialState: { contador: 0, esVip: false, pagoRecibido: false },
        services: { notificar: () => {} },
      });
    },
    {
      message:
        "❌ ERROR: El nodo 'nodo_inexistente' no existe en la topología del grafo 'grafo_invalido'.",
    },
  );

  // 2. Tipo de nodo sin handler registrado
  const graphHandlerDesconocido = {
    id: "grafo_desconocido",
    nodes: {
      start: { type: "tipo_misterioso" },
    },
  };

  await assert.rejects(
    async () => {
      await executeWorkflow({
        graph: graphHandlerDesconocido,
        initialState: { contador: 0, esVip: false, pagoRecibido: false },
        services: { notificar: () => {} },
      });
    },
    {
      message:
        "❌ ERROR: No existe un handler registrado para procesar el tipo de nodo 'tipo_misterioso'.",
    },
  );
});

test("Workflow - Engine: Inferencia Determinista del Nodo Inicial (startNodeId / 'start' / orden de insercion)", async () => {
  // 1. Grafo sin nodo "start", infiere el primer nodo en orden de declaración ("paso_inicial")
  const graphSinStartKey = wf.create({
    id: "grafo_sin_start_key",
    nodes: {
      paso_inicial: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate({ contador: 10 });
        },
        onSuccess: "fin",
      },
      fin: { type: "end", status: "OK_SIN_START" },
    },
  });

  const resInferencia = await executeWorkflow({
    graph: graphSinStartKey,
    initialState: { contador: 0, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
  });

  assert.equal(resInferencia.status, "COMPLETED");
  if (resInferencia.status === "COMPLETED") {
    assert.equal(resInferencia.endStatus, "OK_SIN_START");
    assert.equal(resInferencia.finalState.contador, 10);
    assert.equal(resInferencia.history[0].nodeId, "paso_inicial");
  }

  // 2. Grafo con startNodeId explícito sobreescribiendo el orden por defecto
  const resExplicito = await executeWorkflow({
    graph: graphSinStartKey,
    initialState: { contador: 0, esVip: false, pagoRecibido: false },
    services: { notificar: () => {} },
    startNodeId: "fin",
  });

  assert.equal(resExplicito.status, "COMPLETED");
  if (resExplicito.status === "COMPLETED") {
    assert.equal(resExplicito.endStatus, "OK_SIN_START");
    assert.equal(resExplicito.history.length, 1);
    assert.equal(resExplicito.history[0].nodeId, "fin");
  }
});
