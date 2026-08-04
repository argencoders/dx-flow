import { WorkflowGraph, resolveStartNodeId } from "../core/factory.js";

export type IRShape = "box" | "rhombus" | "stadium" | "subgraph";

export interface IRNode {
  id: string;
  label: string;
  type: string;
  shape: IRShape;
  endResult?: "success" | "error" | "compensate" | "terminate";
}

export interface IREdge {
  from: string;
  to: string;
  label?: string;
}

export interface IRGraph {
  startNodeId?: string;
  nodes: IRNode[];
  edges: IREdge[];
}

export function extractWorkflowIR(
  graph: WorkflowGraph<any, any, any, any>,
  options?: { startNodeId?: string }
): IRGraph {
  const nodes = graph?.nodes || {};
  const startNodeId = resolveStartNodeId(nodes, options?.startNodeId);
  const irNodes: IRNode[] = [];
  const irEdges: IREdge[] = [];

  for (const [nodeId, rawNode] of Object.entries<any>(nodes)) {
    const nodeType = rawNode.type || "action";
    let shape: IRShape = "box";
    let endResult: "success" | "error" | "compensate" | "terminate" | undefined = undefined;

    switch (nodeType) {
      case "action":
        shape = "box";
        break;
      case "choose":
        shape = "rhombus";
        break;
      case "delay":
        shape = "box";
        break;
      case "end":
        shape = "stadium";
        endResult = rawNode.result || "success";
        break;
      default:
        shape = "box";
        break;
    }

    irNodes.push({
      id: nodeId,
      label: nodeId,
      type: nodeType,
      shape,
      endResult,
    });

    if (nodeType === "action" || nodeType === "sequence") {
      if (rawNode.onSuccess) {
        irEdges.push({ from: nodeId, to: rawNode.onSuccess, label: "onSuccess" });
      }
      if (rawNode.onError) {
        for (const [errCode, target] of Object.entries<string>(rawNode.onError)) {
          irEdges.push({ from: nodeId, to: target, label: `onError: ${errCode}` });
        }
      }
    } else if (nodeType === "choose") {
      if (Array.isArray(rawNode.choices)) {
        rawNode.choices.forEach((choice: any, index: number) => {
          if (choice.nextNode) {
            irEdges.push({
              from: nodeId,
              to: choice.nextNode,
              label: `choice ${index + 1}`,
            });
          }
        });
      }
      if (rawNode.otherwise) {
        irEdges.push({ from: nodeId, to: rawNode.otherwise, label: "otherwise" });
      }
    } else if (nodeType === "delay") {
      if (rawNode.onTimeout) {
        irEdges.push({
          from: nodeId,
          to: rawNode.onTimeout,
          label: rawNode.durationMs ? `${rawNode.durationMs}ms` : "onTimeout",
        });
      }
    } else if (nodeType === "repeat") {
      if (rawNode.target) {
        irEdges.push({ from: nodeId, to: rawNode.target, label: "loop" });
      }
      if (rawNode.onSuccess) {
        irEdges.push({ from: nodeId, to: rawNode.onSuccess, label: "onSuccess" });
      }
    } else if (nodeType === "parallel") {
      if (Array.isArray(rawNode.branches)) {
        rawNode.branches.forEach((branch: any, index: number) => {
          if (typeof branch === "string") {
            irEdges.push({ from: nodeId, to: branch, label: `branch ${index + 1}` });
          }
        });
      }
      if (rawNode.onSuccess) {
        irEdges.push({ from: nodeId, to: rawNode.onSuccess, label: "onSuccess" });
      }
      if (rawNode.onError) {
        for (const [errCode, target] of Object.entries<string>(rawNode.onError)) {
          irEdges.push({ from: nodeId, to: target, label: `onError: ${errCode}` });
        }
      }
    } else if (nodeType === "subworkflow") {
      if (rawNode.onSuccess) {
        irEdges.push({ from: nodeId, to: rawNode.onSuccess, label: "onSuccess" });
      }
      if (rawNode.onError) {
        for (const [errCode, target] of Object.entries<string>(rawNode.onError)) {
          irEdges.push({ from: nodeId, to: target, label: `onError: ${errCode}` });
        }
      }
    }
  }

  return {
    startNodeId,
    nodes: irNodes,
    edges: irEdges,
  };
}
