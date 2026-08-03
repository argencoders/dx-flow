import { DeepReadonly } from "../../core/deep-readonly.js";
import { WorkflowContext, SuspendResult } from "./context.js";

/**
 * Registro extensible de tipos de nodos del framework (strictly typed).
 */
export interface NodeDefinitions<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
  TEvents = Record<string, any>,
> {
  action: {
    type: "action";
    action: (
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList, TMutations, TEvents> & {
        services: TServices;
      },
    ) => Promise<string | SuspendResult | void> | string | SuspendResult | void;
    onSuccess: TNodesList;
    onError?: Record<string, TNodesList>;
  };

  choose: {
    type: "choose";
    choices: Array<{
      condition: (state: DeepReadonly<TState>) => boolean;
      nextNode: TNodesList;
    }>;
    otherwise: TNodesList;
  };

  delay: {
    type: "delay";
    durationMs: number;
    onTimeout: TNodesList;
  };

  end: {
    type: "end";
    status: string;
  };

  sequence: {
    type: "sequence";
    steps: Array<TNodesList>;
    onSuccess: TNodesList;
  };

  repeat: {
    type: "repeat";
    target: TNodesList;
    until?: (state: DeepReadonly<TState>) => boolean;
    count?: number | ((state: DeepReadonly<TState>) => number);
    onSuccess: TNodesList;
  };

  parallel: {
    type: "parallel";
    branches: Array<TNodesList>;
    onSuccess: TNodesList;
    onError?: Record<string, TNodesList>;
  };
}

/**
 * Validador homórfico que inspecciona cada propiedad contra las firmas de NodeDefinitions.
 */
export type ValidateGraphNodes<
  TNodes,
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
  TEvents = Record<string, any>,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends keyof NodeDefinitions<
        TState,
        TServices,
        TNodesList,
        TMutations,
        TEvents
      >
      ? TType extends "action"
        ? TNodes[K] extends {
            action: (...args: any[]) => Promise<infer TRes> | infer TRes;
          }
          ? TNodes[K] extends { onError: infer E }
            ? E extends Record<string, any>
              ? [TRes] extends [keyof E | SuspendResult | void | undefined]
                ? Omit<TNodes[K], "onError" | "action"> & {
                    type: "action";
                    action: (
                      state: DeepReadonly<TState>,
                      context: WorkflowContext<TState, TNodesList, TMutations, TEvents> & {
                        services: TServices;
                      },
                    ) => Promise<keyof E | SuspendResult | void> | keyof E | SuspendResult | void;
                    onSuccess: TNodesList;
                    onError: { [P in keyof E]: TNodesList };
                  }
                : `❌ ERROR: El nodo '${K & string}' retorna un error no declarado en 'onError'.`
              : NodeDefinitions<TState, TServices, TNodesList, TMutations, TEvents>["action"]
            : [TRes] extends [SuspendResult | void | undefined]
              ? TNodes[K] & {
                  type: "action";
                  action: (
                    state: DeepReadonly<TState>,
                    context: WorkflowContext<TState, TNodesList, TMutations, TEvents> & {
                      services: TServices;
                    },
                  ) => Promise<SuspendResult | void> | SuspendResult | void;
                  onSuccess: TNodesList;
                }
              : `❌ ERROR: El nodo '${K & string}' retorna un código de error pero no especificó 'onError'.`
          : NodeDefinitions<TState, TServices, TNodesList, TMutations, TEvents>["action"]
        : TNodes[K] extends { onError: infer E }
          ? E extends Record<string, any>
            ? Omit<TNodes[K], "onError" | "action"> & {
                type: "action";
                action: (
                  state: DeepReadonly<TState>,
                  context: WorkflowContext<TState, TNodesList, TMutations, TEvents> & {
                    services: TServices;
                  },
                ) => Promise<keyof E | SuspendResult | void> | keyof E | SuspendResult | void;
                onSuccess: TNodesList;
                onError: { [P in keyof E]: TNodesList };
              } & NodeDefinitions<TState, TServices, TNodesList, TMutations, TEvents>["action"]
            : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TMutations, TEvents>[TType]
          : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TMutations, TEvents>[TType]
      : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : {
        type: keyof NodeDefinitions<
          TState,
          TServices,
          TNodesList,
          TMutations,
          TEvents
        >;
      };
};
