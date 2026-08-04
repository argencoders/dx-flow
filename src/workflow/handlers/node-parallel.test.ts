import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeParallelHandler } from "./node-parallel.js";

test("NodeParallel: Transición a la primera rama cuando branches no está vacío", async () => {
  const node = {
    type: "parallel",
    branches: ["rama_cobro", "rama_notificacion"],
    onSuccess: "unir_ramas",
  };

  const result = await nodeParallelHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "rama_cobro",
  });
});

test("NodeParallel: Transición inmediata a onSuccess cuando branches está vacío", async () => {
  const node = {
    type: "parallel",
    branches: [],
    onSuccess: "unir_ramas",
  };

  const result = await nodeParallelHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "unir_ramas",
  });
});

test("NodeParallel: Escenarios de Fallo por Parámetros Inválidos", async () => {
  await assert.rejects(
    async () => {
      await nodeParallelHandler({
        node: { type: "parallel", branches: "no_un_array", onSuccess: "fin" },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'parallel' debe definir una lista 'branches' de tipo array.",
    },
  );

  await assert.rejects(
    async () => {
      await nodeParallelHandler({
        node: { type: "parallel", branches: ["rama_1"] },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'parallel' debe especificar un nodo de destino 'onSuccess'.",
    },
  );
});

test("NodeParallel: Ejecución concurrente de ramas inline y consolidación de mutaciones", async () => {
  let estadoActual = { notificado: false, facturado: false };
  const contextMock = {
    mutate: (patch: any) => {
      estadoActual = { ...estadoActual, ...patch };
    },
  };

  const node = {
    type: "parallel",
    branches: [
      // Rama 1: Shorthand
      (_state: any, ctx: any) => {
        ctx.mutate({ notificado: true });
      },
      // Rama 2: Secuencia inline explícita
      {
        type: "sequence",
        steps: [
          {
            type: "delay",
            durationMs: 50,
          },
          (_state: any, ctx: any) => {
            ctx.mutate({ facturado: true });
          },
        ],
      },
    ],
    onSuccess: "unir_ramas",
  };

  const result = await nodeParallelHandler({
    node,
    state: estadoActual,
    context: contextMock as any,
  });

  assert.equal(estadoActual.notificado, true);
  assert.equal(estadoActual.facturado, true);
  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "unir_ramas",
  });
});
