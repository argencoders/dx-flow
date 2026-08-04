import { test } from "node:test";
import assert from "node:assert/strict";
import { exportToMermaid } from "./mermaid.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters Mermaid: Flujo lineal simple (graph TD)", () => {
  const graph = wf.create({
    id: "wf_lineal",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        onSuccess: "fin",
      },
      fin: {
        type: "end",
        status: "OK",
        result: "success",
      },
    },
  });

  const code = exportToMermaid(graph);

  assert.ok(code.includes("graph TD"));
  assert.ok(code.includes('start["action: start"]'));
  assert.ok(code.includes('fin(["End: fin"])'));
  assert.ok(code.includes("start -->|onSuccess| fin"));
  assert.ok(code.includes("classDef success fill:#d4edda,stroke:#28a745,stroke-width:2px;"));
  assert.ok(code.includes("class fin success;"));
});

test("Workflow - Exporters Mermaid: Dirección personalizada (LR)", () => {
  const graph = wf.create({
    id: "wf_lr",
    nodes: {
      paso_a: {
        type: "action",
        action: () => {},
        onSuccess: "paso_b",
      },
      paso_b: { type: "end", status: "OK" },
    },
  });

  const code = exportToMermaid(graph, { direction: "LR" });

  assert.ok(code.startsWith("graph LR"));
});

test("Workflow - Exporters Mermaid: Ramificaciones choose, onError, delay y estilos CSS semánticos", () => {
  const graph = wf.create({
    id: "wf_ramificado",
    nodes: {
      paso_1: {
        type: "action",
        action: () => {},
        onSuccess: "evaluar",
        onError: { INVALID_DATA: "fin_error" },
      },
      evaluar: {
        type: "choose",
        choices: [{ condition: (s) => s.counter > 0, nextNode: "esperar" }],
        otherwise: "fin_ok",
      },
      esperar: {
        type: "delay",
        durationMs: 1000,
        onTimeout: "fin_ok",
      },
      fin_ok: { type: "end", status: "OK", result: "success" },
      fin_error: { type: "end", status: "ERR", result: "error" },
    },
  });

  const code = exportToMermaid(graph);

  assert.ok(code.includes('evaluar{"choose: evaluar"}'));
  assert.ok(code.includes('esperar[["delay: esperar"]]'));
  assert.ok(code.includes("paso_1 -->|onError: INVALID_DATA| fin_error"));
  assert.ok(code.includes("evaluar -->|choice 1| esperar"));
  assert.ok(code.includes("evaluar -->|otherwise| fin_ok"));
  assert.ok(code.includes("esperar -->|1000ms| fin_ok"));

  assert.ok(code.includes("class fin_ok success;"));
  assert.ok(code.includes("class fin_error error;"));
});

test("Workflow - Exporters Mermaid: Fisonomías avanzadas (repeat, parallel, subworkflow) y estilos compensate/terminate", () => {
  const subGraph = wf.create({
    id: "sub",
    nodes: {
      s_end: { type: "end", status: "OK" },
    },
  });

  const graph = wf.create({
    id: "wf_avanzado",
    nodes: {
      bucle: {
        type: "repeat",
        target: "paralelo",
        onSuccess: "sub_proc",
      },
      paralelo: {
        type: "parallel",
        branches: ["fin_cancelado"],
        onSuccess: "bucle",
      },
      sub_proc: {
        type: "subworkflow",
        workflow: subGraph,
        onSuccess: "fin_matar",
      },
      fin_cancelado: { type: "end", status: "CANCEL", result: "compensate" },
      fin_matar: { type: "end", status: "KILLED", result: "terminate" },
    },
  });

  const code = exportToMermaid(graph);

  assert.ok(code.includes('bucle[["repeat: bucle"]]'));
  assert.ok(code.includes('paralelo[["parallel: paralelo"]]'));
  assert.ok(code.includes('sub_proc[["subworkflow: sub_proc"]]'));

  assert.ok(code.includes("class fin_cancelado compensate;"));
  assert.ok(code.includes("class fin_matar terminate;"));
});
