import { NodeDefinitions, ValidateGraphNodes } from "./validator.js";

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
    }) => {
      return graph;
    },
  };
};
