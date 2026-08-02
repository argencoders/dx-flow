import { DeepReadonly } from "../core/deep-readonly.js";
import { KeyStrategy, ValidatorStrategy } from "../nomenclature/object-keys.js";
import { TypeError } from "../core/types-testing.js";

// Firma flexible que permite al desarrollador retornar un estado completo o parcial
type MutationFn<S, Payload> = (state: S, payload: Payload) => S | Partial<S>;

/**
 * Validador e inyector atómico alimentado por la estrategia inyectada.
 * - Fuerza 'DeepReadonly<TState>' en el primer parámetro de cada callback de forma automática.
 * - Ejecuta la estrategia de nomenclatura 'TCasing' de forma nativa e individual sobre cada clave 'K'.
 * - Si una clave falla, esa propiedad específica se transforma en un TypeError localizado.
 */
type ValidateMutationsMap<
  TState,
  TMethods,
  TCasing extends ValidatorStrategy,
> = {
  [K in keyof TMethods]: KeyStrategy<K>[TCasing] extends false
    ? TypeError<"❌ ERROR: Esta llave viola la convención de nomenclatura configurada para este Store.">
    : TMethods[K] extends (state: any, payload: infer PL) => any
      ? MutationFn<DeepReadonly<TState>, PL>
      : never;
};

/**
 * Punto de entrada del pipeline de mutaciones. Captura el tipo del estado.
 * @template TState - La estructura de datos del estado (debe ser un estado válido).
 * @template TCasing - La estrategia de nomenclatura requerida para las claves (Por defecto: "SCREAMING_SNAKE").
 */
export const defineMutations = <
  TState,
  TCasing extends ValidatorStrategy = "SCREAMING_SNAKE",
>() => {
  return {
    /**
     * Registra, infiere y valida un conjunto de mutaciones bajo el formato inyectado.
     */
    create: <TMethods extends ValidateMutationsMap<TState, TMethods, TCasing>>(
      methods: TMethods,
    ): TMethods => {
      return methods;
    },
  };
};
