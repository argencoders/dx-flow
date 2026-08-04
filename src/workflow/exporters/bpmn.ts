import { WorkflowGraph } from "../core/factory.js";
import { extractWorkflowIR, IRGraph, IRNode } from "./ir.js";
import { createXmlElement, XmlElement } from "./xml-builder.js";

export interface BpmnExporterOptions {
  processId?: string;
  processName?: string;
  startNodeId?: string;
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export function exportToBpmn(
  graph: WorkflowGraph<any, any, any, any> | IRGraph,
  options: BpmnExporterOptions = {}
): string {
  const ir: IRGraph =
    "nodes" in graph && Array.isArray((graph as any).nodes)
      ? (graph as IRGraph)
      : extractWorkflowIR(graph as WorkflowGraph<any, any, any, any>, options);

  const processId = sanitizeId(options.processId || "Process_1");
  const processName = options.processName || "Workflow Process";

  const processChildren: XmlElement[] = [];
  const diagramShapes: XmlElement[] = [];
  const diagramEdges: XmlElement[] = [];

  const startY = 160;
  const startEventX = 180;
  const nodePositions: Record<string, { x: number; y: number; w: number; h: number }> = {};

  let firstNodeX = startEventX;

  // 1. Build Outgoing / Incoming Maps and Calculate Base Levels (BFS)
  const outgoingMap: Record<string, { to: string; label?: string }[]> = {};
  const incomingMap: Record<string, string[]> = {};

  ir.edges.forEach((edge) => {
    if (!outgoingMap[edge.from]) outgoingMap[edge.from] = [];
    outgoingMap[edge.from].push({ to: edge.to, label: edge.label });

    if (!incomingMap[edge.to]) incomingMap[edge.to] = [];
    incomingMap[edge.to].push(edge.from);
  });

  const levelMap: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [];

  if (ir.startNodeId && ir.nodes.some((n) => n.id === ir.startNodeId)) {
    queue.push({ id: ir.startNodeId, level: 0 });
  } else if (ir.nodes.length > 0) {
    queue.push({ id: ir.nodes[0].id, level: 0 });
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levelMap[id] = level;

    const outs = outgoingMap[id] || [];
    outs.forEach((out) => {
      if (!visited.has(out.to)) {
        queue.push({ id: out.to, level: level + 1 });
      }
    });
  }

  ir.nodes.forEach((node, idx) => {
    if (levelMap[node.id] === undefined) {
      levelMap[node.id] = idx;
    }
  });

  if (ir.startNodeId) {
    firstNodeX = startEventX + 120;
  }

  // 2. Register Start Event Shape
  let startEventId: string | undefined = undefined;
  let startFlowId: string | undefined = undefined;

  if (ir.startNodeId) {
    startEventId = "StartEvent_1";
    const sStartTarget = sanitizeId(ir.startNodeId);
    startFlowId = `Flow_${startEventId}_${sStartTarget}`;

    processChildren.push(
      createXmlElement("bpmn:startEvent", { id: startEventId, name: "Start" }, [
        createXmlElement("bpmn:outgoing", {}, [startFlowId]),
      ])
    );

    processChildren.push(
      createXmlElement("bpmn:sequenceFlow", {
        id: startFlowId,
        sourceRef: startEventId,
        targetRef: sStartTarget,
      })
    );

    nodePositions[startEventId] = { x: startEventX, y: startY + 22, w: 36, h: 36 };

    diagramShapes.push(
      createXmlElement("bpmndi:BPMNShape", {
        id: `${startEventId}_di`,
        bpmnElement: startEventId,
      }, [
        createXmlElement("dc:Bounds", {
          x: startEventX,
          y: startY + 22,
          width: 36,
          height: 36,
        }),
      ])
    );
  }

  // 3. Register Nodes
  ir.nodes.forEach((node) => {
    const sId = sanitizeId(node.id);
    let colLevel = levelMap[node.id] ?? 0;

    let shapeW = 100;
    let shapeH = 80;
    let posY = startY;

    // Smart placement for error / fallback nodes
    if (node.type === "end" && (node.endResult === "error" || node.endResult === "compensate")) {
      shapeW = 36;
      shapeH = 36;
      posY = startY + 160;

      const parentIds = incomingMap[node.id] || [];
      if (parentIds.length > 0) {
        const parentLevels = parentIds.map((p) => levelMap[p] ?? 0);
        colLevel = Math.max(...parentLevels);
      }
    } else if (node.type === "end" && node.endResult === "terminate") {
      shapeW = 36;
      shapeH = 36;
      posY = startY - 120;

      const parentIds = incomingMap[node.id] || [];
      if (parentIds.length > 0) {
        const parentLevels = parentIds.map((p) => levelMap[p] ?? 0);
        colLevel = Math.min(...parentLevels);
      }
    } else if (node.type === "end") {
      shapeW = 36;
      shapeH = 36;
      posY = startY + 22;
    } else if (node.type === "choose" || node.type === "parallel") {
      shapeW = 50;
      shapeH = 50;
      posY = startY + 15;
    } else if (node.type === "delay") {
      shapeW = 36;
      shapeH = 36;
      posY = startY + 22;
    }

    let elem: XmlElement;

    switch (node.type) {
      case "action":
        elem = createXmlElement("bpmn:serviceTask", { id: sId, name: node.label });
        break;
      case "choose":
        elem = createXmlElement("bpmn:exclusiveGateway", { id: sId, name: node.label });
        break;
      case "delay":
        elem = createXmlElement("bpmn:intermediateCatchEvent", { id: sId, name: node.label }, [
          createXmlElement("bpmn:timerEventDefinition", { id: `${sId}_timerDef` }),
        ]);
        break;
      case "parallel":
        elem = createXmlElement("bpmn:parallelGateway", { id: sId, name: node.label });
        break;
      case "subworkflow":
        elem = createXmlElement("bpmn:callActivity", { id: sId, name: node.label });
        break;
      case "end":
        const endChildren: XmlElement[] = [];
        if (node.endResult === "error") {
          endChildren.push(createXmlElement("bpmn:errorEventDefinition", { id: `${sId}_errorDef` }));
        } else if (node.endResult === "compensate") {
          endChildren.push(createXmlElement("bpmn:compensateEventDefinition", { id: `${sId}_compensateDef` }));
        } else if (node.endResult === "terminate") {
          endChildren.push(createXmlElement("bpmn:terminateEventDefinition", { id: `${sId}_terminateDef` }));
        }
        elem = createXmlElement("bpmn:endEvent", { id: sId, name: node.label }, endChildren);
        break;
      default:
        elem = createXmlElement("bpmn:task", { id: sId, name: node.label });
        break;
    }

    processChildren.push(elem);

    // Center alignment adjustment for 36x36 nodes under 50x50 gateways
    const isEndNode = node.type === "end";
    const xOffset = isEndNode ? 7 : 0;
    const posX = Math.round(firstNodeX + colLevel * 230 + xOffset);
    nodePositions[sId] = { x: posX, y: posY, w: shapeW, h: shapeH };

    diagramShapes.push(
      createXmlElement("bpmndi:BPMNShape", {
        id: `${sId}_di`,
        bpmnElement: sId,
      }, [
        createXmlElement("dc:Bounds", {
          x: posX,
          y: posY,
          width: shapeW,
          height: shapeH,
        }),
      ])
    );
  });

  // 4. Edge for Start Event
  if (startEventId && startFlowId && ir.startNodeId) {
    const sStartTarget = sanitizeId(ir.startNodeId);
    const posStart = nodePositions[startEventId];
    const posTarget = nodePositions[sStartTarget];

    if (posStart && posTarget) {
      diagramEdges.push(
        createXmlElement("bpmndi:BPMNEdge", {
          id: `${startFlowId}_di`,
          bpmnElement: startFlowId,
        }, [
          createXmlElement("di:waypoint", {
            x: posStart.x + posStart.w,
            y: posStart.y + Math.round(posStart.h / 2),
          }),
          createXmlElement("di:waypoint", {
            x: posTarget.x,
            y: posTarget.y + Math.round(posTarget.h / 2),
          }),
        ])
      );
    }
  }

  // 5. Edges for Graph Transitions with Smart Anchoring & Routing
  ir.edges.forEach((edge, index) => {
    const sFrom = sanitizeId(edge.from);
    const sTo = sanitizeId(edge.to);
    const flowId = `Flow_${sFrom}_${sTo}_${index + 1}`;

    const attrs: Record<string, string> = {
      id: flowId,
      sourceRef: sFrom,
      targetRef: sTo,
    };
    if (edge.label) {
      attrs.name = edge.label;
    }

    processChildren.push(createXmlElement("bpmn:sequenceFlow", attrs));

    const posFrom = nodePositions[sFrom] || { x: 100, y: 100, w: 100, h: 80 };
    const posTo = nodePositions[sTo] || { x: 300, y: 100, w: 100, h: 80 };

    const waypoints: XmlElement[] = [];

    const isErrorOrCompensateBranch = edge.label?.startsWith("onError") || edge.label === "otherwise";

    if (isErrorOrCompensateBranch && posTo.y > posFrom.y) {
      const exitX = posFrom.x + Math.round(posFrom.w / 2);
      const exitY = posFrom.y + posFrom.h;

      const targetCenterX = posTo.x + Math.round(posTo.w / 2);

      if (Math.abs(exitX - targetCenterX) < 35) {
        // Directly underneath: straight vertical down line into top of target
        waypoints.push(
          createXmlElement("di:waypoint", { x: targetCenterX, y: exitY }),
          createXmlElement("di:waypoint", { x: targetCenterX, y: posTo.y })
        );
      } else {
        // Target is to the left/right: L-shaped routing entering left side of target
        const entryY = posTo.y + Math.round(posTo.h / 2);
        waypoints.push(
          createXmlElement("di:waypoint", { x: exitX, y: exitY }),
          createXmlElement("di:waypoint", { x: exitX, y: entryY }),
          createXmlElement("di:waypoint", { x: posTo.x, y: entryY })
        );
      }
    } else {
      // Standard horizontal / orthogonal routing
      const fromCenterY = posFrom.y + Math.round(posFrom.h / 2);
      const toCenterY = posTo.y + Math.round(posTo.h / 2);

      if (Math.abs(fromCenterY - toCenterY) > 20) {
        const midX = posFrom.x + posFrom.w + Math.round((posTo.x - (posFrom.x + posFrom.w)) / 2);
        waypoints.push(
          createXmlElement("di:waypoint", { x: posFrom.x + posFrom.w, y: fromCenterY }),
          createXmlElement("di:waypoint", { x: midX, y: fromCenterY }),
          createXmlElement("di:waypoint", { x: midX, y: toCenterY }),
          createXmlElement("di:waypoint", { x: posTo.x, y: toCenterY })
        );
      } else {
        waypoints.push(
          createXmlElement("di:waypoint", { x: posFrom.x + posFrom.w, y: fromCenterY }),
          createXmlElement("di:waypoint", { x: posTo.x, y: toCenterY })
        );
      }
    }

    diagramEdges.push(
      createXmlElement("bpmndi:BPMNEdge", {
        id: `${flowId}_di`,
        bpmnElement: flowId,
      }, waypoints)
    );
  });

  // 6. Root XML Tree
  const definitions = createXmlElement(
    "bpmn:definitions",
    {
      "xmlns:bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
      "xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
      "xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
      "xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
      id: "Definitions_1",
      targetNamespace: "http://bpmn.io/schema/bpmn",
      exporter: "DX-Flow Workflow Engine",
      exporterVersion: "1.0",
    },
    [
      createXmlElement("bpmn:process", { id: processId, name: processName, isExecutable: "true" }, processChildren),
      createXmlElement("bpmndi:BPMNDiagram", { id: "BPMNDiagram_1" }, [
        createXmlElement("bpmndi:BPMNPlane", { id: "BPMNPlane_1", bpmnElement: processId }, [
          ...diagramShapes,
          ...diagramEdges,
        ]),
      ]),
    ]
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n${definitions.render(0)}`;
}
