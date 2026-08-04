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
> {
  node: any;
  state: DeepReadonly<TState>;
  context: WorkflowContext<TState, TNodesList> & {
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
> = (
  params: NodeHandlerParams<TState, TServices, TNodesList>,
) => Promise<NodeHandlerResult<TNodesList>> | NodeHandlerResult<TNodesList>;

/**
 * Mapa genérico de handlers indexados por el tipo de nodo.
 */
export type NodeHandlersMap<
  TState,
  TServices,
  TNodesList extends string,
> = Record<string, NodeHandler<TState, TServices, TNodesList>>;
