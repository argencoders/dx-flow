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

test("NodeSequence: Ejecución de pasos inline (shorthand, delay inline, choose inline con fallthrough)", async () => {
  let contadorMutado = 0;
  let delayEjecutadoMs = 0;

  const mockContext = {
    mutate: (patch: any) => {
      if (patch.contador !== undefined) contadorMutado = patch.contador;
    },
  };

  const node = {
    type: "sequence",
    steps: [
      (state: any, ctx: any) => {
        ctx.mutate({ contador: state.contador + 1 });
      },
      {
        type: "delay",
        durationMs: 250,
      },
      {
        type: "choose",
        choices: [
          {
            condition: (state: any) => state.esVip,
            nextNode: "descuento_vip",
          },
        ],
      },
    ],
    onSuccess: "fin_secuencia",
  };

  const result = await nodeSequenceHandler({
    node,
    state: { contador: 10, esVip: false },
    context: mockContext as any,
    delayFn: async (ms) => {
      delayEjecutadoMs = ms;
    },
  });

  assert.equal(contadorMutado, 11);
  assert.equal(delayEjecutadoMs, 250);
  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "fin_secuencia",
  });
});

test("NodeSequence: Paso action inline con onError redirige a nodo de error", async () => {
  const node = {
    type: "sequence",
    steps: [
      {
        type: "action",
        action: () => "ERROR_VALIDACION",
        onError: {
          ERROR_VALIDACION: "nodo_error_handler",
        },
      },
    ],
    onSuccess: "fin_secuencia",
  };

  const result = await nodeSequenceHandler({
    node,
    state: {},
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "nodo_error_handler",
  });
});

test("NodeSequence: Paso choose inline con coincidencia desvía a nextNode", async () => {
  const node = {
    type: "sequence",
    steps: [
      {
        type: "choose",
        choices: [
          {
            condition: (state: any) => state.esVip,
            nextNode: "ruta_vip",
          },
        ],
      },
    ],
    onSuccess: "fin_secuencia",
  };

  const result = await nodeSequenceHandler({
    node,
    state: { esVip: true },
    context: {} as any,
  });

  assert.deepStrictEqual(result, {
    type: "NEXT",
    target: "ruta_vip",
  });
});
