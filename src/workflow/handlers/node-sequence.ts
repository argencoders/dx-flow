import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución para nodos de tipo 'sequence'.
 * - Valida la estructura declarativa de 'steps' y 'onSuccess'.
 * - Si 'steps' es un array vacío, transiciona inmediatamente a 'onSuccess'.
 * - Si 'steps' contiene elementos, transiciona al primer nodo de la secuencia ('steps[0]').
 */
export const nodeSequenceHandler: NodeHandler<any, any, any, any> = async ({
  node,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.steps)) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'sequence' debe definir una lista 'steps' de tipo array.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'sequence' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  if (node.steps.length === 0) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  return {
    type: "NEXT",
    target: node.steps[0],
  };
};
