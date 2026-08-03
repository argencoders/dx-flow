import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución para nodos de tipo 'parallel'.
 * - Valida la estructura de 'branches' y 'onSuccess'.
 * - Si 'branches' está vacío, transiciona a 'onSuccess'.
 * - Si contiene ramas, coordina la bifurcación iniciando en 'branches[0]' o convergiendo hacia 'onSuccess'.
 */
export const nodeParallelHandler: NodeHandler<any, any, any, any> = async ({
  node,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.branches)) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'parallel' debe definir una lista 'branches' de tipo array.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'parallel' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  if (node.branches.length === 0) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  return {
    type: "NEXT",
    target: node.branches[0],
  };
};
