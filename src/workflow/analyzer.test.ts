import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeTopology, extractOutgoingEdges } from "./analyzer.js";
import { defineWorkflow } from "./core/factory.js";

interface EstadoTest {
  contador: number;
  esVip: boolean;
}

const wf = defineWorkflow<EstadoTest, any>();

test("Workflow - Analyzer: Extracción de aristas salientes (extractOutgoingEdges)", () => {
  const edgesAction = extractOutgoingEdges({
    type: "action",
    onSuccess: "paso_2",
    onError: { ERROR_PAYMENT: "paso_error" },
  });
  assert.deepEqual(edgesAction.sort(), ["paso_2", "paso_error"].sort());

  const edgesChoose = extractOutgoingEdges({
    type: "choose",
    choices: [{ nextNode: "paso_vip" }, { target: "paso_promo" }],
    otherwise: "paso_estandar",
  });
  assert.deepEqual(edgesChoose.sort(), ["paso_estandar", "paso_promo", "paso_vip"].sort());

  const edgesDelay = extractOutgoingEdges({
    type: "delay",
    durationMs: 1000,
    onTimeout: "paso_tras_espera",
  });
  assert.deepEqual(edgesDelay, ["paso_tras_espera"]);

  const edgesEnd = extractOutgoingEdges({
    type: "end",
    status: "DONE",
  });
  assert.deepEqual(edgesEnd, []);

  const edgesRepeat = extractOutgoingEdges({
    type: "repeat",
    target: "paso_reintentar",
    onSuccess: "paso_siguiente",
  });
  assert.deepEqual(edgesRepeat.sort(), ["paso_reintentar", "paso_siguiente"].sort());
});

test("Workflow - Analyzer: Grafo Válido Lineal y Ramificado", () => {
  const graphValido = wf.create({
    id: "grafo_valido_lineal",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {},
        onSuccess: "evaluar",
        onError: { ERROR: "fin_error" },
      },
      evaluar: {
        type: "choose",
        choices: [{ condition: (s) => s.esVip, nextNode: "esperar" }],
        otherwise: "fin_ok",
      },
      esperar: {
        type: "delay",
        durationMs: 500,
        onTimeout: "fin_ok",
      },
      fin_ok: { type: "end", status: "SUCCESS", result: "success" },
      fin_error: { type: "end", status: "FAILED", result: "error" },
    },
  });

  const res = analyzeTopology(graphValido);

  assert.equal(res.isValid, true);
  assert.equal(res.startNodeId, "start");
  assert.equal(res.nodesCount, 5);
  assert.equal(res.reachableNodes.length, 5);
  assert.equal(res.unreachableNodes.length, 0);
  assert.equal(res.isolatedNodes.length, 0);
  assert.equal(res.deadEndNodes.length, 0);
  assert.equal(res.unclosedCycles.length, 0);
  assert.equal(res.errors.length, 0);
});

test("Workflow - Analyzer: Detección de Nodos Huérfanos e Inalcanzables", () => {
  const graphHuerfanos = wf.create({
    id: "grafo_huerfanos",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        onSuccess: "fin_ok",
      },
      fin_ok: { type: "end", status: "OK" },
      nodo_huerfano: {
        type: "action",
        action: () => {},
        onSuccess: "fin_ok",
      },
      nodo_aislado_total: {
        type: "end",
        status: "ISOLATED",
      },
    },
  });

  const res = analyzeTopology(graphHuerfanos);

  assert.equal(res.reachableNodes.length, 2); // start, fin_ok
  assert.deepEqual(res.unreachableNodes.sort(), ["nodo_aislado_total", "nodo_huerfano"].sort());
  assert.deepEqual(res.isolatedNodes.sort(), ["nodo_aislado_total", "nodo_huerfano"].sort());
  assert.equal(res.warnings.length, 4); // 2 advertencias por inalcanzables + 2 por aislados
});

test("Workflow - Analyzer: Detección de Callejones sin Salida (Dead-End Nodes)", () => {
  const graphCallejon = wf.create({
    id: "grafo_callejon",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        onSuccess: "paso_trampa",
      },
      // @ts-expect-error
      paso_trampa: {
        type: "action",
        action: () => {},
        // ❌ Callejón sin salida: no tiene onSuccess ni onError
      },
      fin_ok: { type: "end", status: "OK" },
    },
  });

  const res = analyzeTopology(graphCallejon);

  assert.equal(res.isValid, false);
  assert.deepEqual(res.deadEndNodes, ["paso_trampa"]);
  assert.ok(res.errors.some((e) => e.includes("paso_trampa")));
});

test("Workflow - Analyzer: Detección de Ciclos Infinitos sin Salida (Unclosed Cycles)", () => {
  const graphCicloInfinito = wf.create({
    id: "grafo_ciclo_infinito",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        onSuccess: "bucle_a",
      },
      bucle_a: {
        type: "action",
        action: () => {},
        onSuccess: "bucle_b",
      },
      bucle_b: {
        type: "action",
        action: () => {},
        onSuccess: "bucle_a",
      },
      fin_inaccesible: { type: "end", status: "OK" },
    },
  });

  const res = analyzeTopology(graphCicloInfinito);

  assert.equal(res.isValid, false);
  assert.ok(res.unclosedCycles.length > 0);
  assert.ok(res.errors.some((e) => e.includes("ciclo infinito sin salida")));
});

test("Workflow - Analyzer: Referencias a Destinos Inexistentes", () => {
  const graphDestinoErroneo = wf.create({
    id: "grafo_destino_erroneo",
    nodes: {
      start: {
        type: "action",
        action: () => {},
        // @ts-ignore - Forzamos destino invalido para probar analisis estatico en runtime
        onSuccess: "nodo_fantasma",
      },
    },
  });

  const res = analyzeTopology(graphDestinoErroneo);

  assert.equal(res.isValid, false);
  assert.ok(res.errors.some((e) => e.includes("referencia un destino inexistente 'nodo_fantasma'")));
});

test("Workflow - Analyzer: Inferencia Determinista del Nodo Inicial", () => {
  // 1. Grafo sin 'start' key pero con startNodeId explicito
  const graphSinStart = wf.create({
    id: "grafo_sin_start",
    nodes: {
      primer_paso: {
        type: "action",
        action: () => {},
        onSuccess: "fin",
      },
      fin: { type: "end", status: "OK" },
    },
  });

  const resInferencia = analyzeTopology(graphSinStart);
  assert.equal(resInferencia.isValid, true);
  assert.equal(resInferencia.startNodeId, "primer_paso");

  const resExplicito = analyzeTopology(graphSinStart, { startNodeId: "fin" });
  assert.equal(resExplicito.isValid, true);
  assert.equal(resExplicito.startNodeId, "fin");
});
