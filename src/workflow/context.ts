import { DeepReadonly } from "../core/deep-readonly.js";

/**
 * Define la firma del contrato de navegación que devuelve un nodo de acción.
 */
export interface NavigationResult {
  readonly __type_navigation__: "NEXT_NODE";
  readonly target: string;
}

/**
 * El Contexto de Ejecución inyectado en cada nodo del Workflow.
 *
 * @template TState - El estado inmutable del negocio.
 * @template TNodesList - Unión de strings con los nombres de todos los nodos del grafo.
 */
export interface WorkflowContext<TState, TNodesList extends string> {
  /**
   * Ordena de forma segura la transición hacia el siguiente nodo del Grafo.
   * Blindado en tiempo de diseño: solo acepta identificadores de nodos existentes.
   */
  next(destination: TNodesList): NavigationResult;

  /**
   * Canal controlado para sugerir o registrar mutaciones sobre los datos del flujo.
   */
  mutate(payload: Partial<TState>): void;
}

/**
 * Implementación básica del constructor del contexto para uso del motor en runtime.
 */
export function createRuntimeContext<TState, TNodesList extends string>(
  onMutation: (payload: Partial<TState>) => void,
): WorkflowContext<TState, TNodesList> {
  return {
    next: (destination: TNodesList): NavigationResult => ({
      __type_navigation__: "NEXT_NODE",
      target: destination,
    }),
    mutate: (payload: Partial<TState>): void => {
      onMutation(payload);
    },
  };
}
