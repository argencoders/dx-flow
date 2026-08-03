import { NodeHandler, NodeHandlerResult } from "./node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'action'.
 * Invoca la función action pasando el estado inmutable y el contexto (con registry)
 * y retorna el nodo destino ordenado mediante context.next().
 * 
 * 💡 USO DE 'any': 'nodeActionHandler' utiliza parámetros genéricos 'any' (NodeHandler<any, any, any, any>)
 * para actuar como handler agnóstico predeterminado registrado en el engine, pudiendo procesar grafos
 * con cualquier tipo de Estado, Registry, Lista de Nodos y Mutaciones sin acoplarse a un workflow específico.
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

  const result = await node.action(state, context);

  if (!result || typeof result.target !== "string") {
    throw new Error(
      `❌ ERROR: La función del nodo 'action' debe devolver un resultado de navegación válido generado por context.next().`,
    );
  }

  return {
    type: "NEXT",
    target: result.target,
  };
};
