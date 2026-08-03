import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeSuspendHandler } from "./node-suspend.js";
import { createRuntimeContext } from "./context.js";

test("Workflow - NodeSuspendHandler: Retorna SUSPEND con eventName y targetOnResume", async () => {
  const context = {
    ...createRuntimeContext(() => {}),
    services: {},
  };

  const res = await nodeSuspendHandler({
    node: {
      type: "suspend",
      eventName: "WEBHOOK_PAGO",
      onResume: "procesar_pago",
    },
    state: {},
    context,
  });

  assert.equal(res.type, "SUSPEND");
  if (res.type === "SUSPEND") {
    assert.equal(res.eventName, "WEBHOOK_PAGO");
    assert.equal(res.targetOnResume, "procesar_pago");
  }
});

test("Workflow - NodeSuspendHandler: Lanza error si eventName o onResume son inválidos", async () => {
  const context = {
    ...createRuntimeContext(() => {}),
    services: {},
  };

  await assert.rejects(
    async () => {
      await nodeSuspendHandler({
        node: { type: "suspend", eventName: "", onResume: "siguiente" },
        state: {},
        context,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'suspend' debe especificar un 'eventName' (string) válido.",
    },
  );

  await assert.rejects(
    async () => {
      await nodeSuspendHandler({
        node: { type: "suspend", eventName: "OK_EVENT", onResume: "" },
        state: {},
        context,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'suspend' debe especificar un nodo de destino 'onResume' (string).",
    },
  );
});
