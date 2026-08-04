import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución para nodos de tipo 'repeat'.
 * - Evalúa la condición de parada 'until(state)' y/o el conteo de iteraciones 'count'.
 * - Si 'until(state)' es verdades o el conteo alcanzado indica salida, transiciona a 'onSuccess'.
 * - De lo contrario, transiciona a 'target' para ejecutar una iteración del bucle.
 */
export const nodeRepeatHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.target !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'repeat' debe especificar un nodo objetivo 'target'.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'repeat' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  // 1. Evaluación de condición de parada 'until'
  if (typeof node.until === "function" && node.until(state)) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  // 2. Evaluación de conteo de iteraciones 'count'
  if (node.count !== undefined) {
    const maxCount =
      typeof node.count === "function" ? node.count(state) : node.count;

    if (typeof maxCount === "number" && maxCount <= 0) {
      return {
        type: "NEXT",
        target: node.onSuccess,
      };
    }
  }

  // 3. Continuar iteración navegando al nodo target
  return {
    type: "NEXT",
    target: node.target,
  };
};
