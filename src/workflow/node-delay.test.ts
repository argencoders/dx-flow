import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeDelayHandler } from "./node-delay.js";
import { createRuntimeContext } from "./context.js";
import { NodeHandlerParams } from "./node-handler.js";
import { NodeDefinitions } from "./validator.js";
import { defineWorkflow } from "./factory.js";

interface EstadoTest {
  contador: number;
}
type NodosTest = "inicio" | "espera" | "siguiente_nodo";
interface RegistryTest {}
interface MutacionesTest {}

type NodeDelayDef = NodeDefinitions<
  EstadoTest,
  RegistryTest,
  NodosTest,
  MutacionesTest
>["delay"];

test("Workflow - NodeDelay: Ejecución Exitosa con delayFn Inyectado y Fallback por Defecto", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  const nodeDelay: NodeDelayDef = {
    type: "delay",
    durationMs: 5000,
    onTimeout: "siguiente_nodo",
  };

  // 1. Ejecución con delayFn inyectado (Mock para simulación síncrona/instantánea)
  let msRecibido = 0;
  const mockDelayFn = async (ms: number) => {
    msRecibido = ms;
  };

  const paramsInyectado: NodeHandlerParams<
    EstadoTest,
    RegistryTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeDelay,
    state: { contador: 0 },
    context: contextFull,
    delayFn: mockDelayFn,
  };

  const resInyectado = await nodeDelayHandler(paramsInyectado);
  assert.equal(msRecibido, 5000);
  assert.equal(resInyectado.type, "NEXT");
  if (resInyectado.type === "NEXT") {
    assert.equal(resInyectado.target, "siguiente_nodo");
  }

  // 2. Ejecución con delayFn por defecto (setTimeout real con duración breve)
  const nodeDelayCorto: NodeDelayDef = {
    type: "delay",
    durationMs: 10,
    onTimeout: "siguiente_nodo",
  };

  const paramsDefault: NodeHandlerParams<
    EstadoTest,
    RegistryTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeDelayCorto,
    state: { contador: 0 },
    context: contextFull,
  };

  const resDefault = await nodeDelayHandler(paramsDefault);
  assert.equal(resDefault.type, "NEXT");
  if (resDefault.type === "NEXT") {
    assert.equal(resDefault.target, "siguiente_nodo");
  }
});

test("Workflow - NodeDelay: Escenarios de Fallo Detectados en Tiempo de Compilacion (@ts-expect-error)", () => {
  function testFalloTipado() {
    const wf = defineWorkflow<
      EstadoTest,
      RegistryTest,
      MutacionesTest
    >();

    // ❌ ERROR 1: durationMs no es un número
    wf.create({
      id: "err1",
      nodes: {
        start: {
          type: "delay",
          // @ts-expect-error - durationMs debe ser number
          durationMs: "5000",
          onTimeout: "siguiente_nodo",
        },
        siguiente_nodo: { type: "end", status: "OK" },
      },
    });

    // ❌ ERROR 2: Falta la propiedad requerida 'onTimeout'
    wf.create({
      id: "err2",
      nodes: {
        // @ts-expect-error - Falta onTimeout
        start: {
          type: "delay",
          durationMs: 1000,
        },
      },
    });

    // ❌ ERROR 3: 'onTimeout' apunta a un nodo inexistente en TNodesList
    wf.create({
      id: "err3",
      nodes: {
        start: {
          type: "delay",
          durationMs: 1000,
          // @ts-expect-error - nodo_inexistente no está declarado en nodes
          onTimeout: "nodo_inexistente",
        },
        siguiente_nodo: { type: "end", status: "OK" },
      },
    });
  }
});

test("Workflow - NodeDelay: Escenarios de Fallo de Runtime", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  // 1. durationMs no es un número
  await assert.rejects(
    async () => {
      await nodeDelayHandler({
        node: { type: "delay", durationMs: "1000", onTimeout: "siguiente_nodo" },
        state: { contador: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'delay' debe especificar una propiedad 'durationMs' numérica mayor o igual a 0.",
    },
  );

  // 2. durationMs es un número negativo
  await assert.rejects(
    async () => {
      await nodeDelayHandler({
        node: { type: "delay", durationMs: -50, onTimeout: "siguiente_nodo" },
        state: { contador: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'delay' debe especificar una propiedad 'durationMs' numérica mayor o igual a 0.",
    },
  );

  // 3. Falta la propiedad onTimeout
  await assert.rejects(
    async () => {
      await nodeDelayHandler({
        node: { type: "delay", durationMs: 1000 },
        state: { contador: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'delay' debe especificar un nodo de destino 'onTimeout'.",
    },
  );
});
