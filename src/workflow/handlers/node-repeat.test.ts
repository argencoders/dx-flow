import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeRepeatHandler } from "./node-repeat.js";

test("NodeRepeat: Redirección a target si until evalúa a false", async () => {
  const node = {
    type: "repeat",
    target: "iterar_paso",
    until: (state: any) => state.contador >= 3,
    onSuccess: "salida_bucle",
  };

  const result = await nodeRepeatHandler({
    node,
    state: { contador: 1 },
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "iterar_paso",
  });
});

test("NodeRepeat: Redirección a onSuccess si until evalúa a true", async () => {
  const node = {
    type: "repeat",
    target: "iterar_paso",
    until: (state: any) => state.contador >= 3,
    onSuccess: "salida_bucle",
  };

  const result = await nodeRepeatHandler({
    node,
    state: { contador: 3 },
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "salida_bucle",
  });
});

test("NodeRepeat: Redirección a onSuccess si count llega a cero", async () => {
  const node = {
    type: "repeat",
    target: "iterar_paso",
    count: 0,
    onSuccess: "salida_bucle",
  };

  const result = await nodeRepeatHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "salida_bucle",
  });
});

test("NodeRepeat: Redirección con count dinámico por función de estado", async () => {
  const node = {
    type: "repeat",
    target: "iterar_paso",
    count: (state: any) => state.restantes,
    onSuccess: "salida_bucle",
  };

  const resultIncompleto = await nodeRepeatHandler({
    node,
    state: { restantes: 2 },
    context: {} as any,
  });

  assert.deepStrictEqual(resultIncompleto, {
    type: "NEXT",
    target: "iterar_paso",
  });

  const resultCompleto = await nodeRepeatHandler({
    node,
    state: { restantes: 0 },
    context: {} as any,
  });

  assert.deepStrictEqual(resultCompleto, {
    type: "NEXT",
    target: "salida_bucle",
  });
});

test("NodeRepeat: Escenarios de Fallo por Parámetros Inválidos", async () => {
  await assert.rejects(
    async () => {
      await nodeRepeatHandler({
        node: { type: "repeat", onSuccess: "fin" },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'repeat' debe especificar un nodo objetivo 'target'.",
    },
  );

  await assert.rejects(
    async () => {
      await nodeRepeatHandler({
        node: { type: "repeat", target: "paso_1" },
        state: {},
        context: {} as any,
      });
    },
    {
      name: "Error",
      message:
        "❌ ERROR: El nodo de tipo 'repeat' debe especificar un nodo de destino 'onSuccess'.",
    },
  );
});
