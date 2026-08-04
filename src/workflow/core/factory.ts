import { NodeDefinitions, ValidateGraphNodes } from "./validator.js";
import { createNodeBuilder } from "./node-builder.js";

/**
 * Representación del Grafo de Workflow conservando las marcas de tipo de su dominio.
 */
export interface WorkflowGraph<
  TState = any,
  TServices = any,
  TNodesList extends string = string,
  TEvents = Record<string, any>,
> {
  readonly id: string;
  readonly nodes: Record<TNodesList, any>;
  readonly _types?: {
    readonly state: TState;
    readonly services: TServices;
    readonly events: TEvents;
  };
}

/**
 * Infiere de manera determinista el ID del nodo inicial de un grafo de workflow.
 * Prioridad: explicitStartNodeId -> clave "start" -> primera clave declarada sintácticamente.
 */
export function resolveStartNodeId<TNodesList extends string = string>(
  nodes: Record<string, any>,
  explicitStartNodeId?: TNodesList,
): TNodesList | undefined {
  if (!nodes || Object.keys(nodes).length === 0) {
    return undefined;
  }
  if (explicitStartNodeId && nodes[explicitStartNodeId]) {
    return explicitStartNodeId;
  }
  if (nodes["start"]) {
    return "start" as TNodesList;
  }
  return Object.keys(nodes)[0] as TNodesList;
}

/**
 * Factoría de workflows con inyección de estado, acciones IoC y eventos externos seguros.
 */
export const defineWorkflow = <
  TState,
  TServices,
  TEvents = Record<string, any>,
>() => {
  const node = createNodeBuilder<TState, TServices, TEvents>();

  return {
    node,
    /**
     * Construye y blinda la consistencia lógica de un Grafo de Workflow.
     */
    create: <
      TNodes extends {
        [K in keyof TNodes]: {
          type: keyof NodeDefinitions<TState, TServices, any, TEvents>;
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
          TEvents
        >;
    }): WorkflowGraph<
      TState,
      TServices,
      keyof TNodes & string,
      TEvents
    > => {
      return graph as any;
    },
  };
};
