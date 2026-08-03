import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeChooseHandler } from "./node-choose.js";
import { createRuntimeContext } from "./context.js";
import { NodeHandlerParams } from "./node-handler.js";
import { NodeDefinitions } from "./validator.js";

interface EstadoTest {
  intentos: number;
  esVip: boolean;
}
type NodosTest = "nodo_reintento" | "nodo_vip" | "nodo_cancelar" | "nodo_error_fallback";
interface RegistryTest {}
interface MutacionesTest {
  REGISTRAR: (state: EstadoTest) => void;
}

type NodeChooseDef = NodeDefinitions<
  EstadoTest,
  RegistryTest,
  NodosTest,
  MutacionesTest
>["choose"];

test("Workflow - NodeChoose: Evaluación Secuencial (First-Match) y Ruta de Escape Otherwise", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  const nodeChoose: NodeChooseDef = {
    type: "choose",
    choices: [
      {
        condition: (state) => state.esVip,
        nextNode: "nodo_vip",
      },
      {
        condition: (state) => state.intentos < 3,
        nextNode: "nodo_reintento",
      },
    ],
    otherwise: "nodo_error_fallback", // 💡 RUTA DE ESCAPE OBLIGATORIA
  };

  const paramsBase: NodeHandlerParams<
    EstadoTest,
    RegistryTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeChoose,
    state: { intentos: 1, esVip: true },
    context: contextFull,
  };

  // 1. Coincide primera condición (esVip = true) -> Redirige a "nodo_vip"
  const resVip = await nodeChooseHandler(paramsBase);
  assert.equal(resVip.type, "NEXT");
  if (resVip.type === "NEXT") {
    assert.equal(resVip.target, "nodo_vip");
  }

  // 2. Coincide segunda condición (esVip = false, intentos = 1 < 3) -> Redirige a "nodo_reintento"
  const resReintento = await nodeChooseHandler({
    ...paramsBase,
    state: { intentos: 1, esVip: false },
  });
  assert.equal(resReintento.type, "NEXT");
  if (resReintento.type === "NEXT") {
    assert.equal(resReintento.target, "nodo_reintento");
  }

  // 3. Ninguna condición devuelve true (esVip = false, intentos = 5) -> Cae en 'otherwise' ("nodo_error_fallback")
  const resFallback = await nodeChooseHandler({
    ...paramsBase,
    state: { intentos: 5, esVip: false },
  });
  assert.equal(resFallback.type, "NEXT");
  if (resFallback.type === "NEXT") {
    assert.equal(resFallback.target, "nodo_error_fallback");
  }
});

test("Workflow - NodeChoose: Escenarios de Fallo Detectados en Tiempo de Compilacion (@ts-expect-error)", () => {
  function testFalloTipado() {
    // ❌ ERROR: Falta la propiedad requerida 'otherwise'
    // @ts-expect-error
    const nodeFaltaOtherwise: NodeChooseDef = {
      type: "choose",
      choices: [
        {
          condition: (state) => state.esVip,
          nextNode: "nodo_vip",
        },
      ],
    };

    // ❌ ERROR: 'otherwise' apunta a un nodo inexistente en NodosTest
    const nodeOtherwiseInvalido: NodeChooseDef = {
      type: "choose",
      choices: [],
      // @ts-expect-error
      otherwise: "NODO_INEXISTENTE",
    };
  }
});

test("Workflow - NodeChoose: Manejo de Errores en Runtime", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  // 1. Sin array choices
  await assert.rejects(
    async () => {
      await nodeChooseHandler({
        node: { type: "choose", choices: null },
        state: { intentos: 0, esVip: false },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'choose' debe contener un array 'choices'.",
    },
  );

  // 2. Ninguna condición devuelve true y no se proveyó 'otherwise'
  await assert.rejects(
    async () => {
      await nodeChooseHandler({
        node: {
          type: "choose",
          choices: [
            {
              condition: () => false,
              nextNode: "nodo_vip",
            },
          ],
        },
        state: { intentos: 0, esVip: false },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: Ninguna condición del nodo 'choose' fue satisfecha y no se especificó una ruta de escape 'otherwise' válida.",
    },
  );
});
