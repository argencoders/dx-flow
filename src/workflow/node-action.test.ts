import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeActionHandler } from "./node-action.js";
import { createRuntimeContext } from "./context.js";
import { NodeHandlerParams } from "./node-handler.js";

interface EstadoTest {
  saldo: number;
}
type NodosTest = "inicio" | "siguiente_nodo";
interface RegistryTest {
  procesar: (monto: number) => boolean;
}
interface MutacionesTest {
  DEPOSITAR: (state: EstadoTest, monto: number) => void;
}

test("Workflow - NodeAction: Ejecución Síncrona y Asíncrona con Contexto y Registry", async () => {
  let mutacionRegistrada = "";
  let payloadRegistrado = 0;

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >((key, payload: any) => { // 💡 'payload: any' es inferido por contexto desde createRuntimeContext debido a los payloads heterogéneos de MutacionesTest
    mutacionRegistrada = String(key);
    payloadRegistrado = payload;
  });

  const contextFull = {
    ...baseCtx,
    registry: {
      procesar: (monto: number) => monto > 0,
    },
  };

  // 1. Caso Síncrono
  const nodeSincrono = {
    type: "action" as const,
    action: (
      state: EstadoTest,
      ctx: typeof contextFull,
    ) => {
      const ok = ctx.registry.procesar(100);
      if (ok) {
        ctx.mutate("DEPOSITAR", 100);
      }
      return ctx.next("siguiente_nodo");
    },
  };

  const paramsSincronos: NodeHandlerParams<
    EstadoTest,
    RegistryTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeSincrono,
    state: { saldo: 50 },
    context: contextFull,
  };

  const resSincrono = await nodeActionHandler(paramsSincronos);

  assert.equal(resSincrono.type, "NEXT");
  if (resSincrono.type === "NEXT") {
    assert.equal(resSincrono.target, "siguiente_nodo");
  }
  assert.equal(mutacionRegistrada, "DEPOSITAR");
  assert.equal(payloadRegistrado, 100);

  // 2. Caso Asíncrono (Promise)
  const nodeAsincrono = {
    type: "action" as const,
    action: async (
      state: EstadoTest,
      ctx: typeof contextFull,
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      ctx.mutate("DEPOSITAR", 200);
      return ctx.next("siguiente_nodo");
    },
  };

  const resAsincrono = await nodeActionHandler({
    ...paramsSincronos,
    node: nodeAsincrono,
  });

  assert.equal(resAsincrono.type, "NEXT");
  if (resAsincrono.type === "NEXT") {
    assert.equal(resAsincrono.target, "siguiente_nodo");
  }
  assert.equal(payloadRegistrado, 200);
});

test("Workflow - NodeAction: Manejo de Errores de Runtime", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: { procesar: () => true } };

  // 1. Sin función action
  await assert.rejects(
    async () => {
      await nodeActionHandler({
        node: { type: "action" },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'action' no contiene una función 'action' ejecutable.",
    },
  );

  // 2. Función action devuelve resultado nulo o inválido
  await assert.rejects(
    async () => {
      await nodeActionHandler({
        node: {
          type: "action",
          action: () => null as any,
        },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: La función del nodo 'action' debe devolver un resultado de navegación válido generado por context.next().",
    },
  );
});
