import { test } from "node:test";
import assert from "node:assert/strict";
import { exportToMermaidState } from "./mermaid-state.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters State: Flujo lineal simple (stateDiagram-v2)", () => {
  const graph = wf.create({
    id: "wf_state_lineal",
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

  const stateCode = exportToMermaidState(graph);

  assert.ok(stateCode.includes("stateDiagram-v2"));
  assert.ok(stateCode.includes("[*] --> start"));
  assert.ok(stateCode.includes("start --> fin: onSuccess"));
  assert.ok(stateCode.includes("fin --> [*]"));
});

test("Workflow - Exporters State: Ramificaciones, notas flotantes de metadatos y snapshot Markdown", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const graphDemo = wf.create({
    id: "wf_demo_state",
    nodes: {
      inicio: {
        type: "action",
        // @ts-ignore
        meta: {
          title: "Procesar Pago",
          service: "PaymentService",
          description: "Ejecuta cobro en la pasarela Stripe.",
        },
        action: () => {},
        onSuccess: "evaluar",
        onError: { PAYMENT_FAILED: "cancelado" },
      },
      evaluar: {
        type: "choose",
        choices: [{ condition: (s) => s.counter > 0, nextNode: "esperar" }],
        otherwise: "completado",
      },
      esperar: {
        type: "delay",
        durationMs: 3600000,
        onTimeout: "completado",
      },
      completado: { type: "end", status: "OK", result: "success" },
      cancelado: { type: "end", status: "ERR", result: "error" },
    },
  });

  const stateCode = exportToMermaidState(graphDemo);

  assert.ok(stateCode.includes("[*] --> inicio"));
  assert.ok(stateCode.includes("note right of inicio"));
  assert.ok(stateCode.includes("Servicio: PaymentService"));
  assert.ok(stateCode.includes("inicio --> evaluar: onSuccess"));
  assert.ok(stateCode.includes("inicio --> cancelado: onError: PAYMENT_FAILED"));

  const snapshotDir = path.join(process.cwd(), "src", "workflow", "exporters", "__snapshots__");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const markdownContent = `# Snapshots Visuales de Diagramas de Estado (\`mermaid-state.test.ts\`)

Este archivo se genera automáticamente durante la ejecución de \`npm run test\` para visualizar los diagramas de estado producidos por \`exportToMermaidState\`.

---

## Diagrama de Estados Finitos (stateDiagram-v2)

\`\`\`mermaid
${stateCode}
\`\`\`
`;

  const snapshotFilePath = path.join(snapshotDir, "mermaid-state-snapshots.md");
  fs.writeFileSync(snapshotFilePath, markdownContent, "utf-8");
  assert.ok(fs.existsSync(snapshotFilePath));
});
