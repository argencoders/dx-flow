import { TypeError } from "./types-testing.js";
import { DefaultStateValue } from "./state-values.js";

type ERR_VALOR_PROHIBIDO =
  TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

/**
 * Validador unitario para tipos nativos complejos integrados del sistema.
 * Si el tipo provisto es un nativo pero no está incluido en TValue, colapsa a error.
 */
export type CheckNativeLeaf<T, TValue = DefaultStateValue> = T extends
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  ? T extends TValue
    ? T
    : ERR_VALOR_PROHIBIDO
  : T; // Si no es un tipo nativo, lo deja pasar intacto para que lo evalúe otra capa
