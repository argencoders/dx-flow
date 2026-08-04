import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeSubworkflowHandler } from "./node-subworkflow.js";
import { defineWorkflow } from "../core/factory.js";

const subWorkflowBuilder = defineWorkflow<{ contador: number }, {}>();

const subGraphExito = subWorkflowBuilder.create({
  id: "sub_exito",
  nodes: {
    incrementar: {
      type: "action",
      action: (state, ctx) => {
        ctx.mutate({ contador: state.contador + 10 });
      },
      onSuccess: "fin_sub",
    },
    fin_sub: { type: "end", status: "DONE" },
  },
});

const subGraphError = subWorkflowBuilder.create({
  id: "sub_error",
  nodes: {
    fallar: {
      type: "end",
      status: "FALLO_INTERNO",
      result: "error",
    },
  },
});

const subGraphSuspend = subWorkflowBuilder.create({
  id: "sub_suspend",
  nodes: {
    esperar: {
      type: "action",
      action: (state, ctx) => {
        if (!ctx.signalPayload) {
          return ctx.suspend("esperar_webhook");
        }
      },
      onSuccess: "fin_sub",
    },
    fin_sub: { type: "end", status: "DONE" },
  },
});

test("nodeSubworkflowHandler: Validaciones de estructura", async () => {
  await assert.rejects(
    async () => {
      await nodeSubworkflowHandler({
        node: { type: "subworkflow", onSuccess: "fin" },
        state: {},
        context: {} as any,
      });
    },
    { message: /debe especificar la propiedad 'workflow'/ },
  );

  await assert.rejects(
    async () => {
      await nodeSubworkflowHandler({
        node: { type: "subworkflow", workflow: subGraphExito },
        state: {},
        context: {} as any,
      });
    },
    { message: /debe especificar un nodo de destino 'onSuccess'/ },
  );
});

test("nodeSubworkflowHandler: Ejecución exitosa con mapeo de input y output", async () => {
  let parentState = { total: 5, log: "" };
  let compensationRegistered = false;

  const mockContext: any = {
    services: {},
    mutate: (patch: any) => {
      parentState = { ...parentState, ...patch };
    },
    registerCompensation: (fn: any) => {
      compensationRegistered = true;
    },
  };

  const result = await nodeSubworkflowHandler({
    node: {
      type: "subworkflow",
      workflow: subGraphExito,
      input: (st: any) => ({ contador: st.total }),
      output: (ctx: any, subState: any) => {
        ctx.mutate({ total: subState.contador * 2 });
      },
      compensate: (st: any, ctx: any) => {},
      onSuccess: "siguiente_nodo",
    },
    state: parentState,
    context: mockContext,
  });

  assert.equal(result.type, "NEXT");
  assert.equal(result.target, "siguiente_nodo");
  assert.equal(parentState.total, 30); // (5 + 10) * 2
  assert.equal(compensationRegistered, true);
});

test("nodeSubworkflowHandler: Mapeo de errores vía onError", async () => {
  const result = await nodeSubworkflowHandler({
    node: {
      type: "subworkflow",
      workflow: subGraphError,
      onSuccess: "siguiente_nodo",
      onError: {
        FALLO_INTERNO: "nodo_error_padre",
      },
    },
    state: { contador: 0 },
    context: { services: {} } as any,
  });

  assert.equal(result.type, "NEXT");
  assert.equal(result.target, "nodo_error_padre");
});

test("nodeSubworkflowHandler: Propagación de SUSPEND", async () => {
  const result = await nodeSubworkflowHandler({
    node: {
      type: "subworkflow",
      workflow: subGraphSuspend,
      onSuccess: "siguiente_nodo",
    },
    state: { contador: 0 },
    context: { services: {} } as any,
  });

  assert.equal(result.type, "SUSPEND");
  assert.equal(result.eventName, "esperar_webhook");
});
