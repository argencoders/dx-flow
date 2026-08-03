import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'delay'.
 * Suspende la ejecución durante el tiempo especificado en 'durationMs'
 * y posteriormente navega estáticamente hacia 'onTimeout'.
 *
 * 💡 USO DE 'any': 'nodeDelayHandler' se tipa con NodeHandler<any, any, any, any> para actuar
 * como handler agnóstico predeterminado registrado en el engine, operando sobre cualquier tipo de Estado y Nodos.
 */
export const nodeDelayHandler: NodeHandler<any, any, any, any> = async ({
  node,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.durationMs !== "number" || node.durationMs < 0) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'delay' debe especificar una propiedad 'durationMs' numérica mayor o igual a 0.`,
    );
  }

  if (typeof node?.onTimeout !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'delay' debe especificar un nodo de destino 'onTimeout'.`,
    );
  }

  const sleep =
    delayFn ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  await sleep(node.durationMs);

  return {
    type: "NEXT",
    target: node.onTimeout,
  };
};
