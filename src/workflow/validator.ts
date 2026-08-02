import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext, NavigationResult } from "./context.js";

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
    ) => Promise<NavigationResult> | NavigationResult;
  };

  choose: {
    type: "choose";
    choices: Array<{
      condition: (state: DeepReadonly<TState>) => boolean;
      nextNode: TNodesList;
    }>;
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
