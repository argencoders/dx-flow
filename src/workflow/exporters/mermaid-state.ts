import { WorkflowGraph } from "../core/factory.js";
import { extractWorkflowIR, IRGraph } from "./ir.js";

export interface MermaidStateExporterOptions {
  includeNotes?: boolean;
}

export function exportToMermaidState(
  graph: WorkflowGraph<any, any, any, any> | IRGraph,
  options: MermaidStateExporterOptions = {}
): string {
  const ir: IRGraph =
    "nodes" in graph && Array.isArray((graph as any).nodes)
      ? (graph as IRGraph)
      : extractWorkflowIR(graph as WorkflowGraph<any, any, any, any>);

  const includeNotes = options.includeNotes !== false;
  const lines: string[] = [];

  lines.push("stateDiagram-v2");

  if (ir.startNodeId) {
    lines.push(`    [*] --> ${ir.startNodeId}`);
  }

  ir.nodes.forEach((node) => {
    const nodeMeta = node.meta || {};
    const hasNoteContent =
      includeNotes &&
      (nodeMeta.title || nodeMeta.service || nodeMeta.description || node.retryMaxAttempts);

    if (hasNoteContent) {
      const noteLines: string[] = [];
      if (nodeMeta.title && nodeMeta.title !== node.id) {
        noteLines.push(`<b>${nodeMeta.title}</b>`);
      }
      if (nodeMeta.service) {
        noteLines.push(`Servicio: ${nodeMeta.service}`);
      }
      if (nodeMeta.description) {
        noteLines.push(nodeMeta.description);
      }
      if (node.retryMaxAttempts) {
        noteLines.push(`Reintentos: ${node.retryMaxAttempts}`);
      }

      if (noteLines.length > 0) {
        lines.push(`    note right of ${node.id}`);
        noteLines.forEach((nl) => lines.push(`        ${nl}`));
        lines.push(`    end note`);
      }
    }

    if (node.type === "end") {
      lines.push(`    ${node.id} --> [*]`);
    }
  });

  ir.edges.forEach((edge) => {
    if (edge.label) {
      lines.push(`    ${edge.from} --> ${edge.to}: ${edge.label}`);
    } else {
      lines.push(`    ${edge.from} --> ${edge.to}`);
    }
  });

  return lines.join("\n");
}
