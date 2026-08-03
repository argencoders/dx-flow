import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNodeHandlers,
  createNodeHandlersRegistry,
} from "./node-handlers.js";
import { createRuntimeContext } from "../core/context.js";
import { NodeHandlerParams, NodeHandler } from "../core/node-handler.js";
import { NodeDefinitions } from "../core/validator.js";

interface EstadoTest {
  contador: number;
}
type NodosTest = "inicio" | "siguiente_nodo";
interface ServicesTest {}
interface MutacionesTest {}

test("Workflow - NodeHandlersRegistry: Contiene los handlers nativos ('action', 'choose', 'delay', 'end')", async () => {
  assert.equal(typeof defaultNodeHandlers.action, "function");
  assert.equal(typeof defaultNodeHandlers.choose, "function");
  assert.equal(typeof defaultNodeHandlers.delay, "function");
  assert.equal(typeof defaultNodeHandlers.end, "function");

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, services: {} };

  // Probamos la ejecución del handler 'action' a través del registro
  const nodeAction: NodeDefinitions<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  >["action"] = {
    type: "action",
    action: () => {},
    onSuccess: "siguiente_nodo",
  };

  const paramsAction: NodeHandlerParams<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeAction,
    state: { contador: 1 },
    context: contextFull,
  };

  const resAction = await defaultNodeHandlers.action(paramsAction);
  assert.equal(resAction.type, "NEXT");
  if (resAction.type === "NEXT") {
    assert.equal(resAction.target, "siguiente_nodo");
  }
});

test("Workflow - NodeHandlersRegistry: Permite inyectar y extender handlers personalizados (Plugin Strategy)", async () => {
  const customWebhookHandler: NodeHandler<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  > = async ({ node }) => {
    return {
      type: "NEXT",
      target: node.onResponseOk,
    };
  };

  const registry = createNodeHandlersRegistry<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  >({
    webhook: customWebhookHandler,
  });

  assert.equal(typeof registry.action, "function");
  assert.equal(typeof registry.webhook, "function");

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});

  const resCustom = await registry.webhook({
    node: { type: "webhook", onResponseOk: "siguiente_nodo" },
    state: { contador: 0 },
    context: { ...baseCtx, services: {} },
  });

  assert.equal(resCustom.type, "NEXT");
  if (resCustom.type === "NEXT") {
    assert.equal(resCustom.target, "siguiente_nodo");
  }
});

test("Workflow - NodeHandlersRegistry: Permite sobreescribir handlers predeterminados", async () => {
  const customDelayHandler: NodeHandler<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  > = async () => {
    return {
      type: "END",
      status: "DELAY_OVERRIDDEN",
    };
  };

  const registry = createNodeHandlersRegistry<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  >({
    delay: customDelayHandler,
  });

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});

  const resOverridden = await registry.delay({
    node: { type: "delay", durationMs: 10, onTimeout: "siguiente_nodo" },
    state: { contador: 0 },
    context: { ...baseCtx, services: {} },
  });

  assert.equal(resOverridden.type, "END");
  if (resOverridden.type === "END") {
    assert.equal(resOverridden.status, "DELAY_OVERRIDDEN");
  }
});
