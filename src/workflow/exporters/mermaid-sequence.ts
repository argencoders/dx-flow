import { WorkflowGraph } from "../core/factory.js";
import { extractWorkflowIR, IRGraph, formatDurationMs } from "./ir.js";

export interface MermaidSequenceExporterOptions {
  actorName?: string;
  engineName?: string;
  stateStoreName?: string;
}

export function exportToMermaidSequence(
  graph: WorkflowGraph<any, any, any, any> | IRGraph,
  options: MermaidSequenceExporterOptions = {}
): string {
  const ir: IRGraph =
    "nodes" in graph && Array.isArray((graph as any).nodes)
      ? (graph as IRGraph)
      : extractWorkflowIR(graph as WorkflowGraph<any, any, any, any>);

  const actor = options.actorName || "Client";
  const engine = options.engineName || "Engine";
  const stateStore = options.stateStoreName || "StateStore";

  const lines: string[] = [];

  lines.push("sequenceDiagram");
  lines.push("    autonumber");
  lines.push(`    actor ${actor} as 👤 ${actor}`);
  lines.push(`    participant ${engine} as ⚙️ ${engine}`);
  lines.push(`    participant ${stateStore} as 💾 ${stateStore}`);

  const serviceSet = new Set<string>();
  ir.nodes.forEach((n) => {
    if (n.meta?.service) {
      serviceSet.add(n.meta.service);
    }
  });

  serviceSet.forEach((svc) => {
    lines.push(`    participant ${svc} as 🛠️ ${svc}`);
  });

  lines.push("");
  lines.push(`    ${actor}->>${engine}: executeWorkflow(inputState)`);
  lines.push(`    ${engine}->>${stateStore}: snapshot(STATUS: RUNNING)`);

  ir.nodes.forEach((node) => {
    const sId = node.id;
    const targetService = node.meta?.service || engine;
    const label = node.meta?.title || sId;

    lines.push("");
    lines.push(`    %% Node: ${sId}`);

    switch (node.type) {
      case "action":
        if (targetService !== engine) {
          lines.push(`    ${engine}->>${targetService}: ${sId} (${label})`);
          if (node.meta?.sideEffects && node.meta.sideEffects.length > 0) {
            lines.push(`    ${targetService}->>${stateStore}: mutate(${node.meta.sideEffects.join(", ")})`);
          }
          lines.push(`    ${targetService}-->>${engine}: void (onSuccess)`);
        } else {
          lines.push(`    ${engine}->>${engine}: executeAction(${sId})`);
        }
        break;

      case "choose":
        lines.push(`    ${engine}->>${engine}: evaluateChoose(${sId})`);
        break;

      case "delay":
        const durationStr = formatDurationMs(node.durationMs);
        lines.push(`    ${engine}->>${stateStore}: dehydrate(STATUS: SUSPENDED, node: "${sId}")`);
        lines.push(`    Note over ${engine},${stateStore}: ⏸️ Suspended for ${durationStr}`);
        lines.push(`    ${actor}->>${engine}: resumeWorkflow(instanceId)`);
        lines.push(`    ${engine}->>${stateStore}: rehydrate()`);
        break;

      case "subworkflow":
        lines.push(`    ${engine}->>${engine}: invokeSubworkflow(${sId})`);
        break;

      case "end":
        const endStatus = node.endResult || "success";
        lines.push(`    ${engine}->>${stateStore}: finalize(STATUS: ${endStatus.toUpperCase()})`);
        lines.push(`    ${engine}-->>${actor}: workflowResult(${endStatus})`);
        break;

      default:
        lines.push(`    ${engine}->>${engine}: step(${sId})`);
        break;
    }
  });

  return lines.join("\n");
}
