import { DeepReadonly } from "../../core/deep-readonly.js";
import { WorkflowContext, SuspendResult } from "./context.js";

/**
 * Parámetros para construir un nodo 'action'.
 */
export interface ActionNodeParams<
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
  TActionReturn = void,
> {
  action: (
    state: DeepReadonly<TState>,
    context: WorkflowContext<TState, TNodesList, TEvents> & {
      services: TServices;
    },
  ) => TActionReturn;
  onSuccess: TNodesList;
  onError?: Record<string, TNodesList>;
}

/**
 * Parámetros para construir un nodo 'choose'.
 */
export interface ChooseNodeParams<TState, TNodesList extends string> {
  choices: Array<{
    condition: (state: DeepReadonly<TState>) => boolean;
    nextNode: TNodesList;
  }>;
  otherwise: TNodesList;
}

/**
 * Parámetros para construir un nodo 'delay'.
 */
export interface DelayNodeParams<TNodesList extends string> {
  durationMs: number;
  onTimeout: TNodesList;
}

/**
 * Parámetros para construir un nodo 'sequence'.
 */
export interface SequenceNodeParams<TNodesList extends string> {
  steps: Array<TNodesList>;
  onSuccess: TNodesList;
}

/**
 * Parámetros para construir un nodo 'repeat'.
 */
export interface RepeatNodeParams<TState, TNodesList extends string> {
  target: TNodesList;
  until?: (state: DeepReadonly<TState>) => boolean;
  count?: number | ((state: DeepReadonly<TState>) => number);
  onSuccess: TNodesList;
}

/**
 * Parámetros para construir un nodo 'parallel'.
 */
export interface ParallelNodeParams<TNodesList extends string> {
  branches: Array<TNodesList>;
  onSuccess: TNodesList;
  onError?: Record<string, TNodesList>;
}

/**
 * Parámetros para construir un nodo 'end'.
 */
export interface EndNodeParams {
  status: string;
}

/**
 * Interfaz de la factoría fluida de nodos.
 */
export interface NodeBuilder<
  TState = any,
  TServices = any,
  TEvents = Record<string, any>,
> {
  action: <TActionReturn, TNodesList extends string = string>(
    params: ActionNodeParams<TState, TServices, TNodesList, TEvents, TActionReturn>,
  ) => { type: "action" } & ActionNodeParams<
    TState,
    TServices,
    TNodesList,
    TEvents,
    TActionReturn
  >;

  choose: <TNodesList extends string = string>(
    params: ChooseNodeParams<TState, TNodesList>,
  ) => { type: "choose" } & ChooseNodeParams<TState, TNodesList>;

  delay: <TNodesList extends string = string>(
    params: DelayNodeParams<TNodesList>,
  ) => { type: "delay" } & DelayNodeParams<TNodesList>;

  sequence: <TNodesList extends string = string>(
    params: SequenceNodeParams<TNodesList>,
  ) => { type: "sequence" } & SequenceNodeParams<TNodesList>;

  repeat: <TNodesList extends string = string>(
    params: RepeatNodeParams<TState, TNodesList>,
  ) => { type: "repeat" } & RepeatNodeParams<TState, TNodesList>;

  parallel: <TNodesList extends string = string>(
    params: ParallelNodeParams<TNodesList>,
  ) => { type: "parallel" } & ParallelNodeParams<TNodesList>;

  end: (params: EndNodeParams) => { type: "end" } & EndNodeParams;
}

/**
 * Crea una instancia del creador fluido de nodos con los genéricos de dominio prefijados.
 */
export function createNodeBuilder<
  TState,
  TServices,
  TEvents = Record<string, any>,
>(): NodeBuilder<TState, TServices, TEvents> {
  return {
    action: (params: any) => ({ type: "action", ...params }),
    choose: (params: any) => ({ type: "choose", ...params }),
    delay: (params: any) => ({ type: "delay", ...params }),
    sequence: (params: any) => ({ type: "sequence", ...params }),
    repeat: (params: any) => ({ type: "repeat", ...params }),
    parallel: (params: any) => ({ type: "parallel", ...params }),
    end: (params: any) => ({ type: "end", ...params }),
  } as NodeBuilder<TState, TServices, TEvents>;
}
