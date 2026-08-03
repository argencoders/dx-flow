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
