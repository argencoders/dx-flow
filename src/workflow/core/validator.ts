import { DeepReadonly } from "../../core/deep-readonly.js";
import { WorkflowContext, SuspendResult } from "./context.js";

export interface InlineActionStep<
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
> {
  type: "action";
  action: (
    state: DeepReadonly<TState>,
    context: WorkflowContext<TState, TNodesList, TEvents> & {
      services: TServices;
    },
  ) => Promise<string | SuspendResult | void> | string | SuspendResult | void;
  onError?: Record<string, TNodesList>;
}

export interface InlineDelayStep {
  type: "delay";
  durationMs: number;
}

export interface InlineChooseStep<TState, TNodesList extends string> {
  type: "choose";
  choices: Array<{
    condition: (state: DeepReadonly<TState>) => boolean;
    nextNode: TNodesList;
  }>;
  otherwise?: TNodesList;
}

export type InlineStep<
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
> =
  | InlineActionStep<TState, TServices, TNodesList, TEvents>
  | InlineDelayStep
  | InlineChooseStep<TState, TNodesList>
  | ((
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList, TEvents> & {
        services: TServices;
      },
    ) => Promise<string | SuspendResult | void> | string | SuspendResult | void);

/**
 * Validador atómico paso a paso para elementos inline dentro de sequence.steps.
 */
export type ValidateSingleInlineStep<
  TStep,
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
> = TStep extends (...args: any[]) => Promise<infer TRes> | infer TRes
  ? [TRes] extends [SuspendResult | void | undefined]
    ? (
        state: DeepReadonly<TState>,
        context: WorkflowContext<TState, TNodesList, TEvents> & {
          services: TServices;
        },
      ) => Promise<SuspendResult | void> | SuspendResult | void
    : `❌ ERROR: La función inline shorthand no puede retornar códigos de error. Usar formato de objeto { type: "action", action: ..., onError: ... }.`
  : TStep extends { type: "action" }
    ? TStep extends {
        action: (...args: any[]) => Promise<infer TRes> | infer TRes;
      }
      ? TStep extends { onError: infer E }
        ? E extends Record<string, any>
          ? [TRes] extends [keyof E | SuspendResult | void | undefined]
            ? Omit<TStep, "action" | "onError"> & {
                type: "action";
                action: (
                  state: DeepReadonly<TState>,
                  context: WorkflowContext<TState, TNodesList, TEvents> & {
                    services: TServices;
                  },
                ) => Promise<keyof E | SuspendResult | void> | keyof E | SuspendResult | void;
                onError: { [P in keyof E]: TNodesList };
              }
            : Omit<TStep, "action"> & {
                action: `❌ ERROR: El paso inline 'action' retorna un error no declarado en 'onError'.`;
              }
          : InlineActionStep<TState, TServices, TNodesList, TEvents>
        : [TRes] extends [SuspendResult | void | undefined]
          ? Omit<TStep, "action"> & {
              type: "action";
              action: (
                state: DeepReadonly<TState>,
                context: WorkflowContext<TState, TNodesList, TEvents> & {
                  services: TServices;
                },
              ) => Promise<SuspendResult | void> | SuspendResult | void;
            }
          : Omit<TStep, "action"> & {
              action: `❌ ERROR: El paso inline 'action' retorna un código de error pero no especificó 'onError'.`;
            }
      : InlineActionStep<TState, TServices, TNodesList, TEvents>
    : TStep extends { type: "delay" }
      ? InlineDelayStep
      : TStep extends { type: "choose" }
        ? InlineChooseStep<TState, TNodesList>
        : InlineStep<TState, TServices, TNodesList, TEvents>;

/**
 * Mapeador tupla/arreglo para validar la lista completa de pasos inline.
 */
export type ValidateSequenceSteps<
  TSteps,
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
> = {
  [I in keyof TSteps]: ValidateSingleInlineStep<
    TSteps[I],
    TState,
    TServices,
    TNodesList,
    TEvents
  >;
};

/**
 * Registro extensible de tipos de nodos del framework (strictly typed).
 */
export interface NodeDefinitions<
  TState,
  TServices,
  TNodesList extends string,
  TEvents = Record<string, any>,
> {
  action: {
    type: "action";
    action: (
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList, TEvents> & {
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
    steps: Array<InlineStep<TState, TServices, TNodesList, TEvents>>;
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
  TEvents = Record<string, any>,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends keyof NodeDefinitions<TState, TServices, TNodesList, TEvents>
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
                      context: WorkflowContext<TState, TNodesList, TEvents> & {
                        services: TServices;
                      },
                    ) => Promise<keyof E | SuspendResult | void> | keyof E | SuspendResult | void;
                    onSuccess: TNodesList;
                    onError: { [P in keyof E]: TNodesList };
                  }
                : `❌ ERROR: El nodo '${K & string}' retorna un error no declarado en 'onError'.`
              : NodeDefinitions<TState, TServices, TNodesList, TEvents>["action"]
            : [TRes] extends [SuspendResult | void | undefined]
              ? TNodes[K] & {
                  type: "action";
                  action: (
                    state: DeepReadonly<TState>,
                    context: WorkflowContext<TState, TNodesList, TEvents> & {
                      services: TServices;
                    },
                  ) => Promise<SuspendResult | void> | SuspendResult | void;
                  onSuccess: TNodesList;
                }
              : `❌ ERROR: El nodo '${K & string}' retorna un código de error pero no especificó 'onError'.`
          : NodeDefinitions<TState, TServices, TNodesList, TEvents>["action"]
        : TType extends "sequence"
          ? TNodes[K] extends { steps: infer TSteps }
            ? TSteps extends Array<any>
              ? Omit<TNodes[K], "steps"> & {
                  type: "sequence";
                  steps: ValidateSequenceSteps<
                    TSteps,
                    TState,
                    TServices,
                    TNodesList,
                    TEvents
                  >;
                  onSuccess: TNodesList;
                }
              : NodeDefinitions<TState, TServices, TNodesList, TEvents>["sequence"]
            : NodeDefinitions<TState, TServices, TNodesList, TEvents>["sequence"]
          : TNodes[K] extends { onError: infer E }
            ? E extends Record<string, any>
              ? Omit<TNodes[K], "onError" | "action"> & {
                  type: "action";
                  action: (
                    state: DeepReadonly<TState>,
                    context: WorkflowContext<TState, TNodesList, TEvents> & {
                      services: TServices;
                    },
                  ) => Promise<keyof E | SuspendResult | void> | keyof E | SuspendResult | void;
                  onSuccess: TNodesList;
                  onError: { [P in keyof E]: TNodesList };
                } & NodeDefinitions<TState, TServices, TNodesList, TEvents>["action"]
              : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TEvents>[TType]
            : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TEvents>[TType]
      : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : {
        type: keyof NodeDefinitions<TState, TServices, TNodesList, TEvents>;
      };
};
