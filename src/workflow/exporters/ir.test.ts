import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWorkflowIR } from "./ir.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters IR: Extracción de grafo lineal simple", () => {
  const graph = wf.create({
    id: "wf_lineal",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        onSuccess: "fin_ok",
      },
      fin_ok: {
        type: "end",
        status: "SUCCESS",
        result: "success",
      },
    },
  });

  const ir = extractWorkflowIR(graph);

  assert.equal(ir.startNodeId, "start");
  assert.equal(ir.nodes.length, 2);
  assert.equal(ir.edges.length, 1);

  assert.deepEqual(ir.nodes[0], {
    id: "start",
    label: "start",
    type: "action",
    shape: "box",
  });

  assert.deepEqual(ir.nodes[1], {
    id: "fin_ok",
    label: "fin_ok",
    type: "end",
    shape: "stadium",
    endResult: "success",
  });

  assert.deepEqual(ir.edges[0], {
    from: "start",
    to: "fin_ok",
    label: "onSuccess",
  });
});

test("Workflow - Exporters IR: Extracción de ramificaciones, errores y temporizadores", () => {
  const graph = wf.create({
    id: "wf_complejo",
    nodes: {
      paso_1: {
        type: "action",
        action: () => {},
        onSuccess: "evaluar",
        onError: { PAYMENT_FAILED: "fin_error" },
      },
      evaluar: {
        type: "choose",
        choices: [{ condition: (s) => s.counter > 0, nextNode: "esperar" }],
        otherwise: "fin_ok",
      },
      esperar: {
        type: "delay",
        durationMs: 5000,
        onTimeout: "fin_ok",
      },
      fin_ok: { type: "end", status: "OK", result: "success" },
      fin_error: { type: "end", status: "FAILED", result: "error" },
    },
  });

  const ir = extractWorkflowIR(graph);

  assert.equal(ir.startNodeId, "paso_1");
  assert.equal(ir.nodes.length, 5);

  const nodeTypes = ir.nodes.map((n) => n.type);
  assert.deepEqual(nodeTypes, ["action", "choose", "delay", "end", "end"]);

  const edgesFromPaso1 = ir.edges.filter((e) => e.from === "paso_1");
  assert.equal(edgesFromPaso1.length, 2);
  assert.ok(edgesFromPaso1.some((e) => e.to === "evaluar" && e.label === "onSuccess"));
  assert.ok(edgesFromPaso1.some((e) => e.to === "fin_error" && e.label === "onError: PAYMENT_FAILED"));

  const edgesFromEvaluar = ir.edges.filter((e) => e.from === "evaluar");
  assert.equal(edgesFromEvaluar.length, 2);
  assert.ok(edgesFromEvaluar.some((e) => e.to === "esperar" && e.label === "choice 1"));
  assert.ok(edgesFromEvaluar.some((e) => e.to === "fin_ok" && e.label === "otherwise"));

  const edgesFromEsperar = ir.edges.filter((e) => e.from === "esperar");
  assert.equal(edgesFromEsperar.length, 1);
  assert.deepEqual(edgesFromEsperar[0], {
    from: "esperar",
    to: "fin_ok",
    label: "5s",
  });
});

test("Workflow - Exporters IR: Extracción de fisonomías avanzadas (repeat, parallel, subworkflow)", () => {
  const subGraph = wf.create({
    id: "sub_flow",
    nodes: {
      sub_start: { type: "end", status: "OK" },
    },
  });

  const graph = wf.create({
    id: "wf_avanzado",
    nodes: {
      bucle: {
        type: "repeat",
        target: "paso_paralelo",
        onSuccess: "sub_proc",
      },
      paso_paralelo: {
        type: "parallel",
        branches: ["rama_a"],
        onSuccess: "bucle",
      },
      rama_a: {
        type: "end",
        status: "CANCELLED",
        result: "compensate",
      },
      sub_proc: {
        type: "subworkflow",
        workflow: subGraph,
        onSuccess: "fin_terminar",
      },
      fin_terminar: {
        type: "end",
        status: "TERMINATED",
        result: "terminate",
      },
    },
  });

  const ir = extractWorkflowIR(graph);

  assert.equal(ir.startNodeId, "bucle");
  assert.equal(ir.nodes.length, 5);

  const nodeResults = ir.nodes.filter((n) => n.type === "end").map((n) => n.endResult);
  assert.ok(nodeResults.includes("compensate"));
  assert.ok(nodeResults.includes("terminate"));

  const loopEdges = ir.edges.filter((e) => e.from === "bucle");
  assert.equal(loopEdges.length, 2);
  assert.ok(loopEdges.some((e) => e.to === "paso_paralelo" && e.label === "loop"));
  assert.ok(loopEdges.some((e) => e.to === "sub_proc" && e.label === "onSuccess"));

  const parallelEdges = ir.edges.filter((e) => e.from === "paso_paralelo");
  assert.equal(parallelEdges.length, 2);
  assert.ok(parallelEdges.some((e) => e.to === "rama_a" && e.label === "branch 1"));
  assert.ok(parallelEdges.some((e) => e.to === "bucle" && e.label === "onSuccess"));
});
