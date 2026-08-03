import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'action'.
 * - Si la función 'action' resuelve sin retornar nada (void / undefined), la ejecución ha sido exitosa
 *   y navega estáticamente hacia 'onSuccess'.
 * - Si la función 'action' invoca 'ctx.suspend(eventName)', congela la ejecución del workflow.
 * - Si la función 'action' retorna una clave de error (string), se busca determinísticamente
 *   su mapeo en el diccionario declarativo 'onError'.
 */
export const nodeActionHandler: NodeHandler<any, any, any, any> = async ({
  node,
  state,
  context,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.action !== "function") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'action' no contiene una función 'action' ejecutable.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'action' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  const result = await node.action(state, context);

  // 1. Éxito: La función retornó void / undefined -> Navegar a onSuccess
  if (result === undefined || result === null) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  // 2. Suspensión Dinámica: La función retornó un resultado de ctx.suspend(...)
  if (
    typeof result === "object" &&
    result?.__type_navigation__ === "SUSPEND_NODE"
  ) {
    return {
      type: "SUSPEND",
      eventName: result.eventName,
    };
  }

  // 3. Error Mapeado: La función retornó una clave de error (string) -> Buscar en onError
  if (typeof result === "string") {
    const errorTarget = node?.onError?.[result];
    if (typeof errorTarget !== "string") {
      throw new Error(
        `❌ ERROR: El código de error '${result}' devuelto por 'action' no está mapeado en 'onError'.`,
      );
    }
    return {
      type: "NEXT",
      target: errorTarget,
    };
  }

  throw new Error(
    `❌ ERROR: La función del nodo 'action' debe devolver void en caso de éxito, ctx.suspend() para pausar, o un string de error manejado en 'onError'.`,
  );
};
