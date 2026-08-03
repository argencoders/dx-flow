import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext } from "./context.js";

/**
 * Registro extensible de tipos de nodos del framework (4 parámetros strictly typed).
 */
export interface NodeDefinitions<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> {
  action: {
    type: "action";
    action: (
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList, TMutations> & {
        services: TServices;
      },
    ) => Promise<string | void> | string | void;
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
}

/**
 * Validador homórfico que inspecciona cada propiedad contra las firmas de NodeDefinitions.
 * 💡 PASO 3: INFERENCIA Y VALIDACIÓN ESTRICTA DEL RETURN TYPE DE action
 * 1. Si NO especifica 'onError', la función 'action' debe retornar strictly 'void | Promise<void>'.
 * 2. Si especifica 'onError', la función 'action' se contextualiza con 'Promise<keyof onError | void> | keyof onError | void',
 *    ofreciendo autocompletado del error retornado e infiriendo 'void' para ejecuciones exitosas.
 * 3. Si 'action' retorna una clave de error no declarada en 'onError', se emite un error descriptivo.
 */
export type ValidateGraphNodes<
  TNodes,
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends keyof NodeDefinitions<
        TState,
        TServices,
        TNodesList,
        TMutations
      >
      ? TType extends "action"
        ? TNodes[K] extends {
            action: (...args: any[]) => Promise<infer TRes> | infer TRes;
          }
          ? TNodes[K] extends { onError: infer E }
            ? E extends Record<string, any>
              ? [TRes] extends [keyof E | void | undefined]
                ? Omit<TNodes[K], "onError" | "action"> & {
                    type: "action";
                    action: (
                      state: DeepReadonly<TState>,
                      context: WorkflowContext<TState, TNodesList, TMutations> & {
                        services: TServices;
                      },
                    ) => Promise<keyof E | void> | keyof E | void;
                    onSuccess: TNodesList;
                    onError: { [P in keyof E]: TNodesList };
                  }
                : `❌ ERROR: El nodo '${K & string}' retorna el error '${Exclude<TRes, void | undefined> & string}' que no está declarado en 'onError'.`
              : NodeDefinitions<TState, TServices, TNodesList, TMutations>["action"]
            : [TRes] extends [void | undefined]
              ? TNodes[K] & {
                  type: "action";
                  action: (
                    state: DeepReadonly<TState>,
                    context: WorkflowContext<TState, TNodesList, TMutations> & {
                      services: TServices;
                    },
                  ) => Promise<void> | void;
                  onSuccess: TNodesList;
                }
              : `❌ ERROR: El nodo '${K & string}' retorna el error '${Exclude<TRes, void | undefined> & string}' pero no especificó 'onError'.`
          : NodeDefinitions<TState, TServices, TNodesList, TMutations>["action"]
        : TNodes[K] extends { onError: infer E }
          ? E extends Record<string, any>
            ? Omit<TNodes[K], "onError" | "action"> & {
                type: "action";
                action: (
                  state: DeepReadonly<TState>,
                  context: WorkflowContext<TState, TNodesList, TMutations> & {
                    services: TServices;
                  },
                ) => Promise<keyof E | void> | keyof E | void;
                onSuccess: TNodesList;
                onError: { [P in keyof E]: TNodesList };
              } & NodeDefinitions<TState, TServices, TNodesList, TMutations>["action"]
            : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TMutations>[TType]
          : TNodes[K] & NodeDefinitions<TState, TServices, TNodesList, TMutations>[TType]
      : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : {
        type: keyof NodeDefinitions<
          TState,
          TServices,
          TNodesList,
          TMutations
        >;
      };
};
