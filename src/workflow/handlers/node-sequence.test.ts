import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeSequenceHandler } from "./node-sequence.js";

test("NodeSequence: Redirección al primer paso cuando steps no está vacío", async () => {
  const node = {
    type: "sequence",
    steps: ["paso_a", "paso_b"],
    onSuccess: "nodo_final",
  };

  const result = await nodeSequenceHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "paso_a",
  });
});

test("NodeSequence: Transición a onSuccess cuando steps está vacío", async () => {
  const node = {
    type: "sequence",
    steps: [],
    onSuccess: "nodo_final",
  };

  const result = await nodeSequenceHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "nodo_final",
  });
});

test("NodeSequence: Escenarios de Fallo por Parámetros Inválidos", async () => {
  await assert.rejects(
    async () => {
      await nodeSequenceHandler({
        node: { type: "sequence", steps: "no_un_array", onSuccess: "fin" },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'sequence' debe definir una lista 'steps' de tipo array.",
    },
  );

  await assert.rejects(
    async () => {
      await nodeSequenceHandler({
        node: { type: "sequence", steps: ["paso_1"] },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'sequence' debe especificar un nodo de destino 'onSuccess'.",
    },
  );
});
