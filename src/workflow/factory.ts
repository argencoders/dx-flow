import { NodeDefinitions, ValidateGraphNodes } from "./validator.js";

/**
 * Factoría de workflows con inyección de estado, acciones IoC y mutaciones seguras.
 */
export const defineWorkflow = <TState, TRegistry, TMutations>() => {
  return {
    /**
     * Construye y blinda la consistencia lógica de un Grafo de Workflow.
     */
    create: <
      TNodes extends {
        [K in keyof TNodes]: {
          type: keyof NodeDefinitions<TState, TRegistry, any, TMutations>;
        };
      },
    >(graph: {
      readonly id: string;
      readonly nodes: TNodes &
        ValidateGraphNodes<
          TNodes,
          TState,
          TRegistry,
          keyof TNodes & string,
          TMutations
        >;
    }) => {
      return graph;
    },
  };
};
