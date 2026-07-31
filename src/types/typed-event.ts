// #region FRAMEWORK: HISTORIAL DE EVENTOS TIPADOS

/**
 * Tu Extractor de Payloads Optimizado.
 * Extrae directamente el índice 1 de la tupla de parámetros.
 * Si el resultado es 'unknown' o no existe (porque la función solo tiene 1 argumento),
 * lo forzamos a resolver a 'undefined' de forma mandatoria.
 */
type ExtractPayload<TFunc extends (...args: any[]) => any> =
  Parameters<TFunc>[1];

/**
 * Generador Dinámico de Unión Discriminada.
 * Tu versión: Limpia, explícita y blindada con validación de seguridad.
 */
export type TypedEvent<TDict> = {
  [K in keyof TDict]: TDict[K] extends (...args: any[]) => any
    ? {
        type: K;
        payload: ExtractPayload<TDict[K]>;
      }
    : never;
}[keyof TDict];

/**
 * EL GUARDIÁN DEL ARRAY
 * Tu versión: Mapea posicionalmente el array enviado evitando el ensanchamiento perezoso.
 */
export type ValidateHistoryArray<TDict, H> = {
  [K in keyof H]: H[K] extends TypedEvent<TDict> ? H[K] : TypedEvent<TDict>;
};

// #endregion
