import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext } from "./context.js";

/**
 * Registro extensible de tipos de nodos del framework (4 parámetros estrictos).
 */
export interface NodeDefinitions<
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> {
  action: {
    type: "action";
    action: (
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList, TMutations> & {
        registry: TRegistry;
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
 * Para los nodos 'action':
 * - Si no se especifica 'onError', 'action' debe devolver void. Al resolver, navega a 'onSuccess'.
 * - Si se especifica 'onError', 'action' puede devolver void (éxito -> onSuccess) o una clave de error
 *   que debe estar obligatoriamente declarada en 'onError'.
 */
export type ValidateGraphNodes<
  TNodes,
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends "action"
      ? TNodes[K] extends {
          action: (...args: any[]) => Promise<infer TRes> | infer TRes;
        }
        ? TNodes[K] extends { onError: infer TErrorMap }
          ? TErrorMap extends Record<string, TNodesList>
            ? [TRes] extends [keyof TErrorMap | void]
              ? TNodes[K] extends { onSuccess: TNodesList }
                ? TNodes[K]
                : NodeDefinitions<TState, TRegistry, TNodesList, TMutations>["action"]
              : {
                  type: "action";
                  action: (
                    state: DeepReadonly<TState>,
                    context: WorkflowContext<TState, TNodesList, TMutations> & {
                      registry: TRegistry;
                    },
                  ) => Promise<keyof TErrorMap | void> | keyof TErrorMap | void;
                  onSuccess: TNodesList;
                  onError: TErrorMap;
                }
            : NodeDefinitions<TState, TRegistry, TNodesList, TMutations>["action"]
          : [TRes] extends [void]
            ? TNodes[K] extends { onSuccess: TNodesList }
              ? TNodes[K]
              : NodeDefinitions<TState, TRegistry, TNodesList, TMutations>["action"]
            : {
                type: "action";
                action: (
                  state: DeepReadonly<TState>,
                  context: WorkflowContext<TState, TNodesList, TMutations> & {
                    registry: TRegistry;
                  },
                ) => Promise<void> | void;
                onSuccess: TNodesList;
              }
        : NodeDefinitions<TState, TRegistry, TNodesList, TMutations>["action"]
      : TType extends keyof NodeDefinitions<
            TState,
            TRegistry,
            TNodesList,
            TMutations
          >
        ? TNodes[K] extends NodeDefinitions<
            TState,
            TRegistry,
            TNodesList,
            TMutations
          >[TType]
          ? TNodes[K]
          : NodeDefinitions<TState, TRegistry, TNodesList, TMutations>[TType]
        : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : TNodes[K];
};
