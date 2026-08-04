/**
 * Define la firma del contrato de navegación hacia el siguiente nodo de un workflow.
 */
export interface NavigationResult {
  readonly __type_navigation__: "NEXT_NODE";
  readonly target: string;
}

/**
 * Define la firma del contrato de suspensión devuelto por un nodo de acción.
 */
export interface SuspendResult {
  readonly __type_navigation__: "SUSPEND_NODE";
  readonly eventName: string;
}

/**
 * El Contexto de Ejecución avanzado inyectado en cada nodo de acción.
 *
 * @template TState - El estado inmutable del negocio.
 * @template TNodesList - Unión de strings con los nombres de todos los nodos del grafo.
 * @template TEvents - El diccionario de eventos/señales externas esperadas y sus payloads.
 */
export interface WorkflowContext<
  TState,
  TNodesList extends string,
  TEvents = Record<string, any>,
> {
  /**
   * Ordena la transición hacia el siguiente nodo del Grafo.
   */
  next(destination: TNodesList): NavigationResult;

  /**
   * Ordena la suspensión del workflow a la espera de un evento o señal externa.
   */
  suspend<E extends keyof TEvents & string>(eventName: E): SuspendResult;

  /**
   * Aplica un patch parcial al estado actual del workflow.
   * El nuevo estado será `{ ...state, ...patch }`.
   */
  mutate(patch: Partial<TState>): void;

  /**
   * Payload inyectado cuando el workflow se reanuda tras recibir un evento o señal externa.
   */
  signalPayload?: TEvents[keyof TEvents];
}

/**
 * Implementación del constructor del contexto para el uso del motor en runtime.
 */
export function createRuntimeContext<
  TState,
  TNodesList extends string,
  TEvents = Record<string, any>,
>(
  onMutation: (patch: Partial<TState>) => void,
): WorkflowContext<TState, TNodesList, TEvents> {
  return {
    next: (destination: TNodesList): NavigationResult => ({
      __type_navigation__: "NEXT_NODE",
      target: destination,
    }),
    suspend: <E extends keyof TEvents & string>(eventName: E): SuspendResult => ({
      __type_navigation__: "SUSPEND_NODE",
      eventName,
    }),
    mutate: (patch: Partial<TState>): void => {
      onMutation(patch);
    },
  };
}
