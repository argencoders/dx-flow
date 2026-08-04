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

test("Workflow - Exporters Mermaid: Generación de vistas previas visuales (mermaid-exporter-snapshots.md)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  // Caso 1: Flujo Ramificado y Temporizado
  const graphRamificado = wf.create({
    id: "wf_demo_ramificado",
    nodes: {
      inicio: {
        type: "action",
        action: () => {},
        onSuccess: "evaluar_cliente",
        onError: { ERROR_PAGO: "cancelado" },
      },
      evaluar_cliente: {
        type: "choose",
        choices: [{ condition: (s) => s.counter > 0, nextNode: "espera_aprobacion" }],
        otherwise: "completado",
      },
      espera_aprobacion: {
        type: "delay",
        durationMs: 3600000,
        onTimeout: "completado",
      },
      completado: { type: "end", status: "COMPLETED", result: "success" },
      cancelado: { type: "end", status: "PAYMENT_FAILED", result: "error" },
    },
  });

  // Caso 2: Saga y Paralelismo con resultados Compensate y Terminate
  const subGraph = wf.create({
    id: "sub_audit",
    nodes: {
      auditar: { type: "end", status: "AUDITED" },
    },
  });

  const graphSaga = wf.create({
    id: "wf_demo_saga",
    nodes: {
      bucle_reintentos: {
        type: "repeat",
        target: "procesar_paralelo",
        onSuccess: "sub_auditoria",
      },
      procesar_paralelo: {
        type: "parallel",
        branches: ["cancelacion_saga"],
        onSuccess: "bucle_reintentos",
      },
      sub_auditoria: {
        type: "subworkflow",
        workflow: subGraph,
        onSuccess: "abortar_emergencia",
      },
      cancelacion_saga: { type: "end", status: "ROLLBACK_DONE", result: "compensate" },
      abortar_emergencia: { type: "end", status: "KILLED", result: "terminate" },
    },
  });

  // Caso 3: Flujo Horizontal (LR) con Bucle de Notificaciones
  const graphHorizontal = wf.create({
    id: "wf_demo_horizontal",
    nodes: {
      preparar_envio: {
        type: "action",
        action: () => {},
        onSuccess: "reintentar_notificacion",
      },
      reintentar_notificacion: {
        type: "repeat",
        count: 3,
        target: "enviado_ok",
        onSuccess: "error_notificacion",
      },
      enviado_ok: { type: "end", status: "SENT", result: "success" },
      error_notificacion: { type: "end", status: "MAX_RETRIES", result: "error" },
    },
  });

  const mmdRamificado = exportToMermaid(graphRamificado);
  const mmdSaga = exportToMermaid(graphSaga);
  const mmdHorizontal = exportToMermaid(graphHorizontal, { direction: "LR" });

  const snapshotDir = path.join(process.cwd(), "src", "workflow", "exporters", "__snapshots__");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const markdownContent = `# Snapshots Visuales del Exportador Mermaid (\`mermaid.test.ts\`)

Este archivo se genera automáticamente durante la ejecución de \`npm run test\` para visualizar los diagramas producidos por \`exportToMermaid\`.

---

## Caso 1: Flujo Ramificado con Reintentos y Temporizador (\`direction: "TD"\`)

\`\`\`mermaid
${mmdRamificado}
\`\`\`

---

## Caso 2: Flujo Avanzado de Saga, Paralelismo y Sub-Workflows (\`result: "compensate" | "terminate"\`)

\`\`\`mermaid
${mmdSaga}
\`\`\`

---

## Caso 3: Flujo Horizontal con Bucle de Reintento de Notificación (\`direction: "LR"\`)

\`\`\`mermaid
${mmdHorizontal}
\`\`\`
`;

  const snapshotFilePath = path.join(snapshotDir, "mermaid-exporter-snapshots.md");
  fs.writeFileSync(snapshotFilePath, markdownContent, "utf-8");
  assert.ok(fs.existsSync(snapshotFilePath));
});


