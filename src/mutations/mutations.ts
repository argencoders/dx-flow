import { DeepReadonly } from "../core/deep-readonly.js";
import { KeyStrategy } from "../nomenclature/object-keys.js";
import { TypeError } from "../core/types-testing.js";

// Firma flexible que permite al desarrollador retornar un estado completo o parcial
type MutationFn<S, Payload> = (state: S, payload: Payload) => S | Partial<S>;

/**
 * Validador e inyector atómico clave por clave.
 * - Fuerza 'DeepReadonly<TState>' en el primer parámetro de cada callback de forma automática.
 * - Ejecuta la estrategia "SCREAMING_SNAKE" de forma nativa e individual sobre cada clave 'K'.
 * - Si una clave falla la convención, esa propiedad específica se transforma en un TypeError,
 *   lo que obliga a TypeScript a pintar la línea roja exactamente debajo de esa clave inválida.
 */
type ValidateMutationsMap<TState, TMethods> = {
  [K in keyof TMethods]: KeyStrategy<K>["SCREAMING_SNAKE"] extends false
    ? TypeError<"❌ ERROR: Esta clave viola la convención SCREAMING_SNAKE.">
    : TMethods[K] extends (state: any, payload: infer PL) => any
      ? MutationFn<DeepReadonly<TState>, PL>
      : never;
};

/**
 * Punto de entrada del pipeline de mutaciones. Captura el tipo del estado.
 */
export const defineMutations = <TState>() => {
  return {
    /**
     * Registra, infiere y valida un conjunto de mutaciones bajo el criterio SCREAMING_SNAKE.
     * Los errores de nomenclatura se marcan exactamente sobre la clave que comete la infracción.
     */
    create: <TMethods extends ValidateMutationsMap<TState, TMethods>>(
      methods: TMethods,
    ): TMethods => {
      return methods;
    },
  };
};
