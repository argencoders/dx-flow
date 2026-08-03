import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext } from "./context.js";

/**
 * Registro extensible de tipos de nodos del framework (4 parámetros strictly typed).
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
 * 💡 EXHAUSTIVIDAD DE onError:
 * Si 'action' devuelve un string (ej: "FONDOS_INSUFICIENTES"), exige obligatoriamente que 'onError'
 * esté presente y contenga dicha llave.
 */
export type ValidateGraphNodes<
  TNodes,
  TState,
  TRegistry,
  TNodesList extends string,
  TMutations,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends keyof NodeDefinitions<
        TState,
        TRegistry,
        TNodesList,
        TMutations
      >
      ? TType extends "action"
        ? TNodes[K] extends {
            action: (...args: any[]) => Promise<infer TRes> | infer TRes;
          }
          ? [TRes] extends [void]
            ? TNodes[K] extends NodeDefinitions<
                TState,
                TRegistry,
                TNodesList,
                TMutations
              >["action"]
              ? TNodes[K]
              : NodeDefinitions<
                  TState,
                  TRegistry,
                  TNodesList,
                  TMutations
                >["action"]
            : TNodes[K] extends { onError: infer E }
              ? E extends Record<string, TNodesList>
                ? [TRes] extends [keyof E | void]
                  ? TNodes[K] & {
                      type: "action";
                      onSuccess: TNodesList;
                      onError: { [P in keyof E]: TNodesList };
                    }
                  : `❌ ERROR: El nodo '${K & string}' retorna '${Exclude<TRes, void> & string}' que no está declarado en 'onError'.`
                : NodeDefinitions<
                    TState,
                    TRegistry,
                    TNodesList,
                    TMutations
                  >["action"]
              : `❌ ERROR: El nodo '${K & string}' retorna '${Exclude<TRes, void> & string}' pero no especificó 'onError'.`
          : NodeDefinitions<
              TState,
              TRegistry,
              TNodesList,
              TMutations
            >["action"]
        : TNodes[K] extends { onError: infer E }
          ? TNodes[K] & {
              type: "action";
              onSuccess: TNodesList;
              onError: { [P in keyof E]: TNodesList };
            } & NodeDefinitions<
                TState,
                TRegistry,
                TNodesList,
                TMutations
              >["action"]
          : TNodes[K] &
              NodeDefinitions<
                TState,
                TRegistry,
                TNodesList,
                TMutations
              >[TType]
      : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : TNodes[K];
};
