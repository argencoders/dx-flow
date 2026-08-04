import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'end'.
 * Marca la terminación del workflow devolviendo el estado final ('status').
 *
 * 💡 USO DE 'any': 'nodeEndHandler' se tipa con NodeHandler<any, any, any, any> para actuar
 * como handler agnóstico predeterminado registrado en el engine, operando sobre cualquier tipo de Estado y Nodos.
 */
export const nodeEndHandler: NodeHandler<any, any, any> = async ({
  node,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.status !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'end' debe especificar una propiedad 'status' de tipo string.`,
    );
  }

  const endResult = node?.result ?? "success";

  return {
    type: "END",
    status: node.status,
    result: endResult,
  };
};
