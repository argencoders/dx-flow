/**
 * Comprueba de forma ultra-estricta si dos tipos son exactamente idénticos.
 * Valida la estructura global, modificadores de solo lectura y remueve de forma homórfica
 * la opcionalidad para forzar una diferencia entre claves opcionales y uniones '| undefined'.
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? (<T>() => T extends { [K in keyof X]-?: X[K] } ? 1 : 2) extends <
        T,
      >() => T extends { [K in keyof Y]-?: Y[K] } ? 1 : 2
      ? true
      : false
    : false;

/**
 * Fuerza a que el argumento genérico sea estrictamente del tipo esperado
 * Si el tipo provisto no es `true`, la restricción se rompe y el compilador arroja un error inmediato.
 */
export type Expect<T extends expected, expected = true> = T;

/**
 * Encapsula un mensaje de error legible por humanos e IA dentro del sistema de tipos.
 * Se utiliza para reemplazar 'never' por un token de error explícito.
 */
export type TypeError<Message extends string> = {
  readonly __type_error__: Message;
};
