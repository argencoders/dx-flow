/**
 * Define la firma del contrato de navegación que devuelve un nodo de acción.
 */
export interface NavigationResult {
  readonly __type_navigation__: "NEXT_NODE";
  readonly target: string;
}

/**
 * El Contexto de Ejecución avanzado inyectado en cada nodo de acción.
 *
 * @template TState - El estado inmutable del negocio.
 * @template TNodesList - Unión de strings con los nombres de todos los nodos del grafo.
 * @template TMutations - El mapa de mutaciones puras registrado para este estado.
 */
export interface WorkflowContext<
  TState,
  TNodesList extends string,
  TMutations,
> {
  /**
   * Ordena la transición hacia el siguiente nodo del Grafo.
   */
  next(destination: TNodesList): NavigationResult;

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
}

/**
 * Implementación del constructor del contexto para el uso del motor en runtime.
 * 💡 CORRECCIÓN EXTRAORDINARIA: El inicializador ahora arrastra TMutations y tipa
 *    correctamente el despachador de eventos en tiempo de ejecución.
 */
export function createRuntimeContext<
  TState,
  TNodesList extends string,
  TMutations,
>(
  onMutation: (mutationKey: keyof TMutations, payload: any) => void,
): WorkflowContext<TState, TNodesList, TMutations> {
  return {
    next: (destination: TNodesList): NavigationResult => ({
      __type_navigation__: "NEXT_NODE",
      target: destination,
    }),
    mutate: <M extends keyof TMutations>(...args: any[]): void => {
      const [mutationKey, payload] = args;
      onMutation(mutationKey, payload);
    },
  };
}
