import { test } from "node:test";
import assert from "node:assert/strict";
import { exportToMermaidSequence } from "./mermaid-sequence.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters Sequence: Flujo lineal simple (sequenceDiagram)", () => {
  const graph = wf.create({
    id: "wf_seq_lineal",
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

  const seqCode = exportToMermaidSequence(graph);

  assert.ok(seqCode.includes("sequenceDiagram"));
  assert.ok(seqCode.includes("autonumber"));
  assert.ok(seqCode.includes("executeWorkflow(inputState)"));
  assert.ok(seqCode.includes("workflowResult(success)"));
});

test("Workflow - Exporters Sequence: Servicios, deshidratación delay y mutaciones en snapshot Markdown", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const graphDemo = wf.create({
    id: "wf_demo_seq",
    nodes: {
      cobrar: {
        type: "action",
        // @ts-ignore
        meta: {
          title: "Procesar Pago Stripe",
          service: "PaymentService",
          sideEffects: ["CHARGE_STRIPE", "UPDATE_ORDER"],
        },
        action: () => {},
        onSuccess: "esperar_aprobacion",
      },
      esperar_aprobacion: {
        type: "delay",
        durationMs: 3600000,
        onTimeout: "completado",
      },
      completado: { type: "end", status: "DELIVERED", result: "success" },
    },
  });

  const seqCode = exportToMermaidSequence(graphDemo);

  assert.ok(seqCode.includes("participant PaymentService as 🛠️ PaymentService"));
  assert.ok(seqCode.includes("Engine->>PaymentService: cobrar"));
  assert.ok(seqCode.includes("PaymentService->>StateStore: mutate(CHARGE_STRIPE, UPDATE_ORDER)"));
  assert.ok(seqCode.includes("dehydrate(STATUS: SUSPENDED, node: \"esperar_aprobacion\")"));
  assert.ok(seqCode.includes("Note over Engine,StateStore: ⏸️ Suspended for 1h"));

  const snapshotDir = path.join(process.cwd(), "src", "workflow", "exporters", "__snapshots__");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const markdownContent = `# Snapshots Visuales de Diagramas de Secuencia (\`mermaid-sequence.test.ts\`)

Este archivo se genera automáticamente durante la ejecución de \`npm run test\` para visualizar los diagramas de secuencia producidos por \`exportToMermaidSequence\`.

---

## Traza de Ejecución de Secuencia (sequenceDiagram)

\`\`\`mermaid
${seqCode}
\`\`\`
`;

  const snapshotFilePath = path.join(snapshotDir, "mermaid-sequence-snapshots.md");
  fs.writeFileSync(snapshotFilePath, markdownContent, "utf-8");
  assert.ok(fs.existsSync(snapshotFilePath));
});
