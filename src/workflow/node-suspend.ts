import { NodeHandler, NodeHandlerResult } from "./node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'suspend'.
 * Congela la ejecución del workflow a la espera de un evento/señal externa.
 */
export const nodeSuspendHandler: NodeHandler<any, any, any, any> = async ({
  node,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.eventName !== "string" || !node.eventName.trim()) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'suspend' debe especificar un 'eventName' (string) válido.`,
    );
  }

  if (typeof node?.onResume !== "string" || !node.onResume.trim()) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'suspend' debe especificar un nodo de destino 'onResume' (string).`,
    );
  }

  return {
    type: "SUSPEND",
    eventName: node.eventName,
    targetOnResume: node.onResume,
  };
};
