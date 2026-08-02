/**
 * Estructura estricta para operaciones exitosas.
 */
export type SuccessResult<T> = {
  readonly success: true;
  readonly data: T;
  readonly error?: never; // Bloquea explícitamente el uso de la propiedad error
};

/**
 * Estructura estricta para operaciones fallidas.
 */
export type FailureResult<E> = {
  readonly success: false;
  readonly data?: never; // Bloquea explícitamente el uso de la propiedad data
  readonly error: E;
};

/**
 * Patrón de resultado estricto y tipado para inversión de control (IoC).
 * Garantiza contratos predecibles tanto en éxito como en fallo.
 */
export type Result<T, E> = SuccessResult<T> | FailureResult<E>;
