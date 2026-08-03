import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext } from "./context.js";

/**
 * Representa el resultado devuelto por cualquier handler de nodo tras su ejecución.
 */
export type NodeHandlerResult<TNodesList extends string> =
  | { type: "NEXT"; target: TNodesList }
  | { type: "END"; status: string };

/**
 * Parámetros estandarizados pasados a un handler de nodo.
 */
export interface NodeHandlerParams<
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> {
  node: any;
  state: DeepReadonly<TState>;
  context: WorkflowContext<TState, TNodesList, TMutations> & {
    registry: TRegistry;
  };
  delayFn?: (ms: number) => Promise<void>;
}

/**
 * Firma funcional genérica para estrategias de ejecución de nodos (Plugin Strategy).
 */
export type NodeHandler<
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> = (
  params: NodeHandlerParams<TState, TRegistry, TNodesList, TMutations>,
) => Promise<NodeHandlerResult<TNodesList>> | NodeHandlerResult<TNodesList>;

/**
 * Mapa genérico de handlers indexados por el tipo de nodo.
 */
export type NodeHandlersMap<
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> = Record<string, NodeHandler<TState, TRegistry, TNodesList, TMutations>>;
