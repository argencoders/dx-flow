import { WorkflowGraph } from "../core/factory.js";
import { extractWorkflowIR, IRGraph, IRNode } from "./ir.js";

export interface MermaidExporterOptions {
  direction?: "TD" | "LR" | "TB" | "BT" | "RL";
  startNodeId?: string;
}

function formatNodeMermaid(node: IRNode): string {
  const label = node.label;
  switch (node.type) {
    case "action":
      return `    ${node.id}["action: ${label}"]`;
    case "choose":
      return `    ${node.id}{"choose: ${label}"}`;
    case "delay":
      return `    ${node.id}[["delay: ${label}"]]`;
    case "end":
      return `    ${node.id}(["End: ${label}"])`;
    case "repeat":
      return `    ${node.id}[["repeat: ${label}"]]`;
    case "parallel":
      return `    ${node.id}[["parallel: ${label}"]]`;
    case "subworkflow":
      return `    ${node.id}[["subworkflow: ${label}"]]`;
    default:
      return `    ${node.id}["${label}"]`;
  }
}

export function exportToMermaid(
  graph: WorkflowGraph<any, any, any, any> | IRGraph,
  options: MermaidExporterOptions = {}
): string {
  const ir: IRGraph =
    "nodes" in graph && Array.isArray((graph as any).nodes)
      ? (graph as IRGraph)
      : extractWorkflowIR(graph as WorkflowGraph<any, any, any, any>, options);

  const direction = options.direction || "LR";
  const lines: string[] = [];

  lines.push(`graph ${direction}`);

  for (const node of ir.nodes) {
    lines.push(formatNodeMermaid(node));
  }

  for (const edge of ir.edges) {
    if (edge.label) {
      lines.push(`    ${edge.from} -->|${edge.label}| ${edge.to}`);
    } else {
      lines.push(`    ${edge.from} --> ${edge.to}`);
    }
  }

  const endNodesWithResult = ir.nodes.filter(
    (n) => n.type === "end" && n.endResult
  );

  if (endNodesWithResult.length > 0) {
    lines.push("");
    lines.push("    classDef success fill:#d4edda,stroke:#28a745,stroke-width:2px;");
    lines.push("    classDef error fill:#f8d7da,stroke:#dc3545,stroke-width:2px;");
    lines.push("    classDef compensate fill:#fff3cd,stroke:#ffc107,stroke-width:2px;");
    lines.push("    classDef terminate fill:#e2e3e5,stroke:#6c757d,stroke-width:2px;");

    for (const node of endNodesWithResult) {
      if (node.endResult) {
        lines.push(`    class ${node.id} ${node.endResult};`);
      }
    }
  }

  return lines.join("\n");
}
