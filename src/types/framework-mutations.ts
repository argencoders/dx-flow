import { DeepReadonly } from "../core/deep-readonly.js";
import { MutationKey } from "./mutation-key.js";

export type FrameworkMutations<TState> = {
  [K in MutationKey<string>]: (
    state: DeepReadonly<TState>,
    payload: any,
  ) => Partial<TState>;
};

/**
 * El Factory del Framework en dos pasos.
 * Usamos un mapeo de validación directo en el genérico de la función:
 * Si una llave 'K' no es igual a su versión en mayúsculas, su firma se destruye (never).
 */
export function defineMutations<TState>() {
  return function <
    M extends {
      [K in keyof M]: K extends MutationKey<K>
        ? (state: DeepReadonly<TState>, payload: any) => Partial<TState>
        : MutationKey<K>;
    },
  >(mutations: M): M {
    return mutations;
  };
}
