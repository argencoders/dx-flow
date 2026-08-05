import { WorkflowGraph } from "../core/factory.js";
import { extractWorkflowIR, IRGraph, IRNode, formatDurationMs } from "./ir.js";

export interface TextNarrativeOptions {
  includeExecutiveSummary?: boolean;
}

export function exportToTextNarrative(
  graph: WorkflowGraph<any, any, any, any> | IRGraph,
  options: TextNarrativeOptions = {}
): string {
  const ir: IRGraph =
    "nodes" in graph && Array.isArray((graph as any).nodes)
      ? (graph as IRGraph)
      : extractWorkflowIR(graph as WorkflowGraph<any, any, any, any>);

  const meta = ir.meta || {};
  const title = meta.title || ir.id || "Flujo de Workflow";
  const lines: string[] = [];

  // Encabezado
  lines.push(`# 📖 Guía Ejecutiva del Workflow: ${title}`);
  if (meta.version) lines.push(`**Versión:** ${meta.version}`);
  if (meta.author) lines.push(`**Autor:** ${meta.author}`);
  if (meta.category) lines.push(`**Categoría:** ${meta.category}`);
  if (meta.tags && meta.tags.length > 0) {
    lines.push(`**Etiquetas:** ${meta.tags.map((t) => `\`${t}\``).join(", ")}`);
  }

  if (meta.description) {
    lines.push("");
    lines.push(`> **Descripción General:** ${meta.description}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  // Resumen Ejecutivo
  if (options.includeExecutiveSummary !== false) {
    const totalNodes = ir.nodes.length;
    const actionsCount = ir.nodes.filter((n) => n.type === "action").length;
    const chooseCount = ir.nodes.filter((n) => n.type === "choose").length;
    const delayCount = ir.nodes.filter((n) => n.type === "delay").length;
    const endNodes = ir.nodes.filter((n) => n.type === "end");

    lines.push("## 📊 Resumen Ejecutivo");
    lines.push(`- **Punto de Entrada Inicial:** \`${ir.startNodeId || "desconocido"}\``);
    lines.push(`- **Total de Nodos Registrados:** ${totalNodes}`);
    lines.push(`  - Acciones / Tareas: ${actionsCount}`);
    lines.push(`  - Puntos de Decisión Condicional (\`choose\`): ${chooseCount}`);
    lines.push(`  - Temporizadores de Espera (\`delay\`): ${delayCount}`);
    lines.push(`  - Nodos Terminales de Finalización (\`end\`): ${endNodes.length}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Detalle del Flujo Paso a Paso
  lines.push("## 📝 Detalle del Flujo Paso a Paso");
  lines.push("");

  ir.nodes.forEach((node, index) => {
    const nodeMeta = node.meta || {};
    let typeBadge = "";

    switch (node.type) {
      case "action":
        typeBadge = "⚙️ Acción / Servicio";
        break;
      case "choose":
        typeBadge = "🔀 Evaluación Condicional";
        break;
      case "delay":
        typeBadge = "⏱️ Temporizador de Espera";
        break;
      case "repeat":
        typeBadge = "🔁 Bucle de Reintento / Iteración";
        break;
      case "parallel":
        typeBadge = "🔀 Ramificación Concurrente";
        break;
      case "subworkflow":
        typeBadge = "📦 Sub-Workflow Anidado";
        break;
      case "end":
        typeBadge = "🏁 Estado Final";
        break;
      default:
        typeBadge = "📌 Paso";
        break;
    }

    lines.push(`### Paso ${index + 1}: \`${node.id}\` *(${typeBadge})*`);

    if (nodeMeta.title && nodeMeta.title !== node.id) {
      lines.push(`- **Nombre de Negocio:** ${nodeMeta.title}`);
    }
    if (nodeMeta.service) {
      lines.push(`- **Servicio Responsable:** \`${nodeMeta.service}\``);
    }
    if (nodeMeta.owner) {
      lines.push(`- **Propietario / Responsable:** ${nodeMeta.owner}`);
    }
    if (nodeMeta.description) {
      lines.push(`- **Descripción:** ${nodeMeta.description}`);
    }
    if (nodeMeta.sideEffects && nodeMeta.sideEffects.length > 0) {
      lines.push(`- **Efectos Secundarios:** ${nodeMeta.sideEffects.join(", ")}`);
    }
    if (node.retryMaxAttempts) {
      lines.push(`- **Política de Reintento:** Máximo ${node.retryMaxAttempts} intentos automáticos.`);
    }
    if (node.type === "delay" && node.durationMs) {
      lines.push(`- **Tiempo de Espera:** **${formatDurationMs(node.durationMs)}** (\`${node.durationMs}ms\`).`);
    }

    // Reglas de Transición Saliente
    const outs = ir.edges.filter((e) => e.from === node.id);
    if (outs.length > 0) {
      lines.push("- **Reglas de Transición:**");
      outs.forEach((out) => {
        const labelStr = out.label ? ` (\`${out.label}\`)` : "";
        if (out.label === "onSuccess") {
          lines.push(`  - 🟢 **En caso de éxito (\`onSuccess\`):** Avanza hacia **\`${out.to}\`**.`);
        } else if (out.label?.startsWith("onError")) {
          lines.push(`  - 🔴 **En caso de fallo ${labelStr}:** Se desvía hacia **\`${out.to}\`**.`);
        } else if (out.label === "otherwise") {
          lines.push(`  - 🔀 **Camino por defecto (\`otherwise\`):** Avanza hacia **\`${out.to}\`**.`);
        } else {
          lines.push(`  - ➡️ **Transición${labelStr}:** Avanza hacia **\`${out.to}\`**.`);
        }
      });
    } else if (node.type === "end") {
      const resSymbol =
        node.endResult === "error"
          ? "🔴 Error"
          : node.endResult === "compensate"
          ? "🟡 Compensación / Rollback"
          : node.endResult === "terminate"
          ? "⚪ Terminación de Emergencia"
          : "🟢 Éxito";
      lines.push(`- **Resultado Semántico:** ${resSymbol}`);
    }

    lines.push("");
  });

  return lines.join("\n");
}
