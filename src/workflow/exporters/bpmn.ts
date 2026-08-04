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

  let currentX = 180;
  const startY = 160;
  const nodePositions: Record<string, { x: number; y: number; w: number; h: number }> = {};

  // Start Event
  if (ir.startNodeId) {
    const startEventId = "StartEvent_1";
    const startFlowId = `Flow_${startEventId}_${sanitizeId(ir.startNodeId)}`;

    processChildren.push(
      createXmlElement("bpmn:startEvent", { id: startEventId, name: "Start" }, [
        createXmlElement("bpmn:outgoing", {}, [startFlowId]),
      ])
    );

    processChildren.push(
      createXmlElement("bpmn:sequenceFlow", {
        id: startFlowId,
        sourceRef: startEventId,
        targetRef: sanitizeId(ir.startNodeId),
      })
    );

    nodePositions[startEventId] = { x: currentX, y: startY + 22, w: 36, h: 36 };

    diagramShapes.push(
      createXmlElement("bpmndi:BPMNShape", {
        id: `${startEventId}_di`,
        bpmnElement: startEventId,
      }, [
        createXmlElement("dc:Bounds", {
          x: currentX,
          y: startY + 22,
          width: 36,
          height: 36,
        }),
      ])
    );

    currentX += 120;
  }

  // Nodes
  ir.nodes.forEach((node, index) => {
    const sId = sanitizeId(node.id);
    let shapeW = 100;
    let shapeH = 80;
    let offsetY = 0;

    let elem: XmlElement;

    switch (node.type) {
      case "action":
        elem = createXmlElement("bpmn:serviceTask", {
          id: sId,
          name: node.label,
        });
        break;
      case "choose":
        shapeW = 50;
        shapeH = 50;
        offsetY = 15;
        elem = createXmlElement("bpmn:exclusiveGateway", {
          id: sId,
          name: node.label,
        });
        break;
      case "delay":
        shapeW = 36;
        shapeH = 36;
        offsetY = 22;
        elem = createXmlElement("bpmn:intermediateCatchEvent", {
          id: sId,
          name: node.label,
        }, [
          createXmlElement("bpmn:timerEventDefinition", {
            id: `${sId}_timerDef`,
          }),
        ]);
        break;
      case "parallel":
        shapeW = 50;
        shapeH = 50;
        offsetY = 15;
        elem = createXmlElement("bpmn:parallelGateway", {
          id: sId,
          name: node.label,
        });
        break;
      case "subworkflow":
        elem = createXmlElement("bpmn:callActivity", {
          id: sId,
          name: node.label,
        });
        break;
      case "end":
        shapeW = 36;
        shapeH = 36;
        offsetY = 22;
        const endChildren: XmlElement[] = [];
        if (node.endResult === "error") {
          endChildren.push(
            createXmlElement("bpmn:errorEventDefinition", {
              id: `${sId}_errorDef`,
            })
          );
        } else if (node.endResult === "compensate") {
          endChildren.push(
            createXmlElement("bpmn:compensateEventDefinition", {
              id: `${sId}_compensateDef`,
            })
          );
        } else if (node.endResult === "terminate") {
          endChildren.push(
            createXmlElement("bpmn:terminateEventDefinition", {
              id: `${sId}_terminateDef`,
            })
          );
        }

        elem = createXmlElement(
          "bpmn:endEvent",
          { id: sId, name: node.label },
          endChildren
        );
        break;
      default:
        elem = createXmlElement("bpmn:task", {
          id: sId,
          name: node.label,
        });
        break;
    }

    processChildren.push(elem);

    const posX = currentX + index * 140;
    const posY = startY + offsetY;
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

  // Edges
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

    diagramEdges.push(
      createXmlElement("bpmndi:BPMNEdge", {
        id: `${flowId}_di`,
        bpmnElement: flowId,
      }, [
        createXmlElement("di:waypoint", {
          x: posFrom.x + posFrom.w,
          y: posFrom.y + Math.round(posFrom.h / 2),
        }),
        createXmlElement("di:waypoint", {
          x: posTo.x,
          y: posTo.y + Math.round(posTo.h / 2),
        }),
      ])
    );
  });

  // Root XML Tree
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
