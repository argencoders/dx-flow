import { DeepReadonly } from "../core/deep-readonly.types.js";
import { KeyStrategy, ValidatorStrategy } from "../nomenclature/object-keys.js";
import { TypeError } from "../core/testing.types.js";

// Firma base mutable que se le expondrá al Reducer/Replay externo
export type PureMutationFn<S, Payload> = (
  state: S,
  payload: Payload,
) => S | Partial<S>;

/**
 * Validador e inyector atómico clave por clave para la fase de diseño.
 * Fuerza 'DeepReadonly<TState>' en el primer parámetro para proteger la declaración.
 */
type ValidateMutationsMap<
  TState,
  TMethods,
  TCasing extends ValidatorStrategy,
> = {
  [K in keyof TMethods]: KeyStrategy<K>[TCasing] extends false
    ? TypeError<"❌ ERROR: Esta llave viola la convención de nomenclatura configurada para este Store.">
    : TMethods[K] extends (state: any, payload: infer PL) => any
      ? (state: DeepReadonly<TState>, payload: PL) => TState | Partial<TState>
      : never;
};

/**
 * Transforma el mapa validado de vuelta a tipos mutables puros (TState puro, no readonly).
 * Esto es lo que el Reducer y el Replay consumirán para trabajar sin fricciones de tipos.
 */
export type UnwrapMutations<TState, TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (
    state: any,
    payload: infer PL,
  ) => any
    ? PureMutationFn<TState, PL>
    : never;
};

/**
 * Factoría pura de Mutaciones.
 */
export const defineMutations = <
  TState,
  TCasing extends ValidatorStrategy = "SCREAMING_SNAKE",
>() => {
  return {
    /**
     * Registra y valida las mutaciones.
     * Devuelve exactamente el objeto del parámetro pero con firmas de estado mutables puras.
     */
    create: <TMethods extends ValidateMutationsMap<TState, TMethods, TCasing>>(
      methods: TMethods,
    ): UnwrapMutations<TState, TMethods> => {
      // En runtime devolvemos el objeto tal cual; el tipado se encarga de limpiarle el Readonly
      return methods as unknown as UnwrapMutations<TState, TMethods>;
    },
  };
};

export // Tipo utilitario independiente para remover el parámetro state (Será parte de los servicios externos)
type PublicActions<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (
    state: any,
    payload: infer PL,
  ) => any
    ? unknown extends PL
      ? () => void
      : (payload: PL) => void
    : never;
};

// Función Factory de Reducer independiente (Simula el servicio separado que querías)
export function createReducer<TState, TMethods>(methods: TMethods) {
  return (state: TState, action: { type: string; payload?: any }): TState => {
    const targetMutation = (methods as any)[action.type];
    if (!targetMutation) return state;
    const result = targetMutation(state, action.payload);
    return { ...state, ...result };
  };
}

/**
 * Transforma un mapa de mutaciones en una unión discriminada de eventos seguros.
 * Mapea cada clave 'K' distribuyéndola en un objeto estructurado con su payload exacto.
 */
export type TypedEvent<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (
    state: any,
    payload: infer PL,
  ) => any
    ? unknown extends PL
      ? { type: K } // Si la mutación no declaró payload, el objeto del evento no lleva esa propiedad
      : { type: K; payload: PL }
    : never;
}[keyof TMethods]; // 💡 El truco '[keyof TMethods]' convierte el objeto mapeado en una Unión pura (Type Union)

/**
 * Representa el diario de eventos o historial cronológico indexado para el Replay.
 */
export type EventLog<TMethods> = TypedEvent<TMethods>[];
