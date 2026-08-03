import { NodeHandlersMap } from "../core/node-handler.js";
import { nodeActionHandler } from "./node-action.js";
import { nodeChooseHandler } from "./node-choose.js";
import { nodeDelayHandler } from "./node-delay.js";
import { nodeEndHandler } from "./node-end.js";
import { nodeSequenceHandler } from "./node-sequence.js";
import { nodeRepeatHandler } from "./node-repeat.js";
import { nodeParallelHandler } from "./node-parallel.js";

/**
 * Registro predeterminado de estrategias de ejecución de nodos del motor (Arquitectura de Plugins sin switch).
 */
export const defaultNodeHandlers: NodeHandlersMap<any, any, any, any> = {
  action: nodeActionHandler,
  choose: nodeChooseHandler,
  delay: nodeDelayHandler,
  end: nodeEndHandler,
  sequence: nodeSequenceHandler,
  repeat: nodeRepeatHandler,
  parallel: nodeParallelHandler,
};

/**
 * Crea y permite extender un diccionario de handlers para el runtime,
 * facilitando la inyección de tipos de nodos personalizados.
 */
export function createNodeHandlersRegistry<
  TState = any,
  TServices = any,
  TNodesList extends string = any,
  TMutations = any,
>(
  customHandlers?: Partial<
    NodeHandlersMap<TState, TServices, TNodesList, TMutations>
  >,
): NodeHandlersMap<TState, TServices, TNodesList, TMutations> {
  return {
    ...defaultNodeHandlers,
    ...customHandlers,
  } as NodeHandlersMap<TState, TServices, TNodesList, TMutations>;
}
