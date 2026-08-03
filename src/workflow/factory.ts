import { NodeDefinitions, ValidateGraphNodes } from "./validator.js";

/**
 * Representación del Grafo de Workflow conservando las marcas de tipo de su dominio.
 */
export interface WorkflowGraph<
  TState = any,
  TServices = any,
  TNodesList extends string = string,
  TMutations = any,
> {
  readonly id: string;
  readonly nodes: Record<TNodesList, any>;
  readonly _types?: {
    readonly state: TState;
    readonly services: TServices;
    readonly mutations: TMutations;
  };
}

/**
 * Factoría de workflows con inyección de estado, acciones IoC y mutaciones seguras.
 */
export const defineWorkflow = <TState, TServices, TMutations>() => {
  return {
    /**
     * Construye y blinda la consistencia lógica de un Grafo de Workflow.
     */
    create: <
      TNodes extends {
        [K in keyof TNodes]: {
          type: keyof NodeDefinitions<TState, TServices, any, TMutations>;
        };
      },
    >(graph: {
      readonly id: string;
      readonly nodes: TNodes &
        ValidateGraphNodes<
          TNodes,
          TState,
          TServices,
          keyof TNodes & string,
          TMutations
        >;
    }): WorkflowGraph<TState, TServices, keyof TNodes & string, TMutations> => {
      return graph as any;
    },
  };
};
