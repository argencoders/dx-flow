import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeActionHandler } from "./node-action.js";
import { createRuntimeContext } from "./context.js";
import { NodeHandlerParams } from "./node-handler.js";
import { NodeDefinitions } from "./validator.js";
import { defineWorkflow } from "./factory.js";

interface EstadoTest {
  saldo: number;
}
type NodosTest = "inicio" | "siguiente_nodo" | "nodo_reintento" | "nodo_renovar";
interface ServicesTest {
  procesar: (monto: number) => { ok: boolean; codigo?: string };
}
interface MutacionesTest {
  DEPOSITAR: (state: EstadoTest, monto: number) => void;
}

type NodeActionDef = NodeDefinitions<
  EstadoTest,
  ServicesTest,
  NodosTest,
  MutacionesTest
>["action"];

test("Workflow - NodeAction: Ejecución Exitosa (void -> onSuccess) y Manejo de Errores (string -> onError)", async () => {
  let mutacionRegistrada = "";
  let payloadRegistrado = 0;

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >((key, payload: any) => { // 💡 'payload: any' inferido por contexto debido a mutaciones heterogéneas
    mutacionRegistrada = String(key);
    payloadRegistrado = payload;
  });

  const contextFull = {
    ...baseCtx,
    services: {
      procesar: (monto: number) => ({ ok: monto > 0 }),
    },
  };

  // 1. Caso Acción Lineal Pura (void -> onSuccess, sin onError)
  const nodePuro: NodeActionDef = {
    type: "action",
    action: (state: EstadoTest, ctx: typeof contextFull) => {
      ctx.mutate("DEPOSITAR", 100);
      // Retorna void implícito -> va a onSuccess
    },
    onSuccess: "siguiente_nodo",
  };

  const paramsBase: NodeHandlerParams<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodePuro,
    state: { saldo: 50 },
    context: contextFull,
  };

  const resPuro = await nodeActionHandler(paramsBase);
  assert.equal(resPuro.type, "NEXT");
  if (resPuro.type === "NEXT") {
    assert.equal(resPuro.target, "siguiente_nodo");
  }
  assert.equal(mutacionRegistrada, "DEPOSITAR");
  assert.equal(payloadRegistrado, 100);

  // 2. Caso Acción con Manejo de Errores (onError)
  const nodeConErrores: NodeActionDef = {
    type: "action",
    action: async (state: EstadoTest, ctx: typeof contextFull) => {
      if (state.saldo < 100) {
        return "FONDOS_INSUFICIENTES";
      }
      ctx.mutate("DEPOSITAR", 50);
    },
    onSuccess: "siguiente_nodo",
    onError: {
      FONDOS_INSUFICIENTES: "nodo_reintento",
    },
  };

  // 2a. Éxito en nodo con onError (saldo >= 100 -> void -> onSuccess)
  const resExito = await nodeActionHandler({
    ...paramsBase,
    node: nodeConErrores,
    state: { saldo: 150 },
  });
  assert.equal(resExito.type, "NEXT");
  if (resExito.type === "NEXT") {
    assert.equal(resExito.target, "siguiente_nodo");
  }

  // 2b. Error mapeado en nodo con onError (saldo < 100 -> "FONDOS_INSUFICIENTES" -> onError.FONDOS_INSUFICIENTES)
  const resError = await nodeActionHandler({
    ...paramsBase,
    node: nodeConErrores,
    state: { saldo: 20 },
  });
  assert.equal(resError.type, "NEXT");
  if (resError.type === "NEXT") {
    assert.equal(resError.target, "nodo_reintento");
  }
});

test("Workflow - NodeAction: Escenarios de Fallo Detectados en Tiempo de Compilacion (@ts-expect-error)", () => {
  function testFalloTipado() {
    const wf = defineWorkflow<
      EstadoTest,
      ServicesTest,
      MutacionesTest
    >();

    // ❌ ERROR 1: Acción retorna un string de error pero el nodo NO declaró 'onError'
    wf.create({
      id: "err1",
      nodes: {
        // @ts-expect-error - Falta onError cuando action retorna string de error
        start: {
          type: "action",
          action: () => "FONDOS_INSUFICIENTES",
          onSuccess: "siguiente_nodo",
        },
        siguiente_nodo: { type: "end", status: "OK" },
      },
    });

    // ❌ ERROR 2: 'onError' declara 'FONDOS_INSUFICIENTES', pero la función retorna 'TARJETA_EXPIRADA'
    wf.create({
      id: "err2",
      nodes: {
        // @ts-expect-error - onError no mapea la llave 'TARJETA_EXPIRADA'
        start: {
          type: "action",
          action: (): "TARJETA_EXPIRADA" | void => "TARJETA_EXPIRADA",
          onSuccess: "siguiente_nodo",
          onError: {
            FONDOS_INSUFICIENTES: "nodo_reintento" as const,
          },
        },
        siguiente_nodo: { type: "end", status: "OK" },
        nodo_reintento: { type: "end", status: "RETRY" },
      },
    });

    // ❌ ERROR 3: Falta la propiedad requerida 'onSuccess'
    wf.create({
      id: "err3",
      nodes: {
        // @ts-expect-error - Falta la propiedad requerida onSuccess
        start: {
          type: "action",
          action: () => {},
        },
      },
    });
  }
});

test("Workflow - NodeAction: Escenarios de Fallo de Runtime", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, services: { procesar: () => ({ ok: true }) } };

  // 1. Sin propiedad onSuccess
  await assert.rejects(
    async () => {
      await nodeActionHandler({
        node: { type: "action", action: () => {} },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'action' debe especificar un nodo de destino 'onSuccess'.",
    },
  );

  // 2. La función devuelve una clave de error no mapeada en onError
  await assert.rejects(
    async () => {
      await nodeActionHandler({
        node: {
          type: "action",
          action: () => "ERROR_NO_MAPEADO",
          onSuccess: "siguiente_nodo",
          onError: { FONDOS_INSUFICIENTES: "nodo_reintento" },
        },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El código de error 'ERROR_NO_MAPEADO' devuelto por 'action' no está mapeado en 'onError'.",
    },
  );
});
