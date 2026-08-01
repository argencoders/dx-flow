import { DeepReadonly } from "../deep-readonly.js";
import { FrameworkMutations } from "../types/framework-mutations.js";
import { TypedEvent, ValidateHistoryArray } from "../types/typed-event.js";

/**
 * Motor de reproducción de estados basado en historial de eventos.
 */
export function executeReplay<
  TState,
  TDict extends FrameworkMutations<TState>,
  H extends ValidateHistoryArray<TDict, H>,
>(history: H, mutations: TDict, initialState: TState): TState {
  // CORRECCIÓN: Pasamos por 'unknown' primero para disolver la rigidez de 'H' y permitir el mapeo de arreglos
  return (history as unknown as any[]).reduce((currentState: TState, event) => {
    const mutator = (mutations as any)[event.type];
    if (!mutator) return currentState;

    return {
      ...currentState,
      ...mutator(currentState as DeepReadonly<TState>, event.payload),
    };
  }, initialState);
}
