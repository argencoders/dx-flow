import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeXml, createXmlElement } from "./xml-builder.js";
import { exportToBpmn } from "./bpmn.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters BPMN: Sanitización y escape de XML (xml-builder)", () => {
  assert.equal(escapeXml('<script>alert("xss & test")</script>'), "&lt;script&gt;alert(&quot;xss &amp; test&quot;)&lt;/script&gt;");

  const elem = createXmlElement("test:tag", { id: "1", label: "A & B" }, ["Contenido <Texto>"]);
  const xmlStr = elem.render(0);

  assert.ok(xmlStr.includes('<test:tag id="1" label="A &amp; B">Contenido &lt;Texto&gt;</test:tag>'));
});

test("Workflow - Exporters BPMN: Flujo lineal simple (exportToBpmn)", () => {
  const graph = wf.create({
    id: "wf_bpmn_lineal",
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

  const xml = exportToBpmn(graph);

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<bpmn:definitions'));
  assert.ok(xml.includes('<bpmn:startEvent id="StartEvent_1" name="Start">'));
  assert.ok(xml.includes('<bpmn:serviceTask id="start" name="start" />'));
  assert.ok(xml.includes('<bpmn:endEvent id="fin" name="fin" />'));
  assert.ok(xml.includes('sourceRef="start" targetRef="fin"'));
  assert.ok(xml.includes('<bpmndi:BPMNDiagram id="BPMNDiagram_1">'));
});

test("Workflow - Exporters BPMN: Elementos complejos y subtipos de Eventos de Fin (error, compensate, terminate)", () => {
  const subGraph = wf.create({
    id: "sub",
    nodes: {
      sub_end: { type: "end", status: "OK" },
    },
  });

  const graph = wf.create({
    id: "wf_bpmn_complejo",
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
        otherwise: "paralelo",
      },
      esperar: {
        type: "delay",
        durationMs: 1000,
        onTimeout: "sub_flow",
      },
      paralelo: {
        type: "parallel",
        branches: ["fin_compensar"],
        onSuccess: "fin_ok",
      },
      sub_flow: {
        type: "subworkflow",
        workflow: subGraph,
        onSuccess: "fin_terminar",
      },
      fin_ok: { type: "end", status: "OK", result: "success" },
      fin_error: { type: "end", status: "FAIL", result: "error" },
      fin_compensar: { type: "end", status: "COMP", result: "compensate" },
      fin_terminar: { type: "end", status: "TERM", result: "terminate" },
    },
  });

  const xml = exportToBpmn(graph);

  assert.ok(xml.includes('<bpmn:serviceTask id="paso_1" name="paso_1" />'));
  assert.ok(xml.includes('<bpmn:exclusiveGateway id="evaluar" name="evaluar" />'));
  assert.ok(xml.includes('<bpmn:intermediateCatchEvent id="esperar" name="esperar">'));
  assert.ok(xml.includes('<bpmn:timerEventDefinition id="esperar_timerDef" />'));
  assert.ok(xml.includes('<bpmn:parallelGateway id="paralelo" name="paralelo" />'));
  assert.ok(xml.includes('<bpmn:callActivity id="sub_flow" name="sub_flow" />'));

  // Eventos de Fin con subtipos
  assert.ok(xml.includes('<bpmn:errorEventDefinition id="fin_error_errorDef" />'));
  assert.ok(xml.includes('<bpmn:compensateEventDefinition id="fin_compensar_compensateDef" />'));
  assert.ok(xml.includes('<bpmn:terminateEventDefinition id="fin_terminar_terminateDef" />'));
});

test("Workflow - Exporters BPMN: Generación de Snapshot XML (.bpmn)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const graphDemo = wf.create({
    id: "wf_demo_bpmn_camunda",
    nodes: {
      recibir_pedido: {
        type: "action",
        action: () => {},
        onSuccess: "validar_stock",
        onError: { SIN_STOCK: "cancelar_orden" },
      },
      validar_stock: {
        type: "choose",
        choices: [{ condition: (s) => s.counter > 0, nextNode: "esperar_despacho" }],
        otherwise: "cancelar_orden",
      },
      esperar_despacho: {
        type: "delay",
        durationMs: 7200000,
        onTimeout: "pedido_entregado",
      },
      pedido_entregado: { type: "end", status: "DELIVERED", result: "success" },
      cancelar_orden: { type: "end", status: "CANCELLED", result: "error" },
    },
  });

  const xmlStr = exportToBpmn(graphDemo, { processId: "ProcesoPedidoCamunda", processName: "Proceso de Pedidos" });

  const snapshotDir = path.join(process.cwd(), "src", "workflow", "exporters", "__snapshots__");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshotFilePath = path.join(snapshotDir, "bpmn-exporter-snapshots.bpmn");
  fs.writeFileSync(snapshotFilePath, xmlStr, "utf-8");
  assert.ok(fs.existsSync(snapshotFilePath));
});
