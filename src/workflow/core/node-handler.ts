import { DeepReadonly } from "../../core/deep-readonly.js";
import { WorkflowContext } from "./context.js";

/**
 * Representa el resultado devuelto por cualquier handler de nodo tras su ejecución.
 */
export type NodeHandlerResult<TNodesList extends string> =
  | { type: "NEXT"; target: TNodesList }
  | { type: "END"; status: string }
  | { type: "SUSPEND"; eventName?: string; targetOnResume?: TNodesList };

/**
 * Parámetros estandarizados pasados a un handler de nodo.
 */
export interface NodeHandlerParams<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> {
  node: any;
  state: DeepReadonly<TState>;
  context: WorkflowContext<TState, TNodesList, TMutations> & {
    services: TServices;
  };
  delayFn?: (ms: number) => Promise<void>;
}

/**
 * Firma funcional genérica para estrategias de ejecución de nodos (Plugin Strategy).
 */
export type NodeHandler<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> = (
  params: NodeHandlerParams<TState, TServices, TNodesList, TMutations>,
) => Promise<NodeHandlerResult<TNodesList>> | NodeHandlerResult<TNodesList>;

/**
 * Mapa genérico de handlers indexados por el tipo de nodo.
 */
export type NodeHandlersMap<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> = Record<string, NodeHandler<TState, TServices, TNodesList, TMutations>>;
