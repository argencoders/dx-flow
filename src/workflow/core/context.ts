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
 * @template TMutations - El mapa de mutaciones puras registrado para este estado.
 * @template TEvents - El diccionario de eventos/señales externas esperadas y sus payloads.
 */
export interface WorkflowContext<
  TState,
  TNodesList extends string,
  TMutations,
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
   * Dispara una mutación controlada exigiendo los payloads específicos de TMutations.
   */
  mutate<M extends keyof TMutations>(
    ...args: TMutations[M] extends (state: any, payload: infer PL) => any
      ? unknown extends PL
        ? [mutationKey: M]
        : [mutationKey: M, payload: PL]
      : never
  ): void;

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
  TMutations,
  TEvents = Record<string, any>,
>(
  onMutation: (mutationKey: keyof TMutations, payload: any) => void,
): WorkflowContext<TState, TNodesList, TMutations, TEvents> {
  return {
    next: (destination: TNodesList): NavigationResult => ({
      __type_navigation__: "NEXT_NODE",
      target: destination,
    }),
    suspend: <E extends keyof TEvents & string>(eventName: E): SuspendResult => ({
      __type_navigation__: "SUSPEND_NODE",
      eventName,
    }),
    mutate: <M extends keyof TMutations>(...args: any[]): void => {
      const [mutationKey, payload] = args;
      onMutation(mutationKey, payload);
    },
  };
}
