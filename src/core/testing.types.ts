/**
 * Comprueba de forma ultra-estricta si dos tipos son exactamente idénticos
 * (mismo grafo de tipos, modificadores readonly y opcionalidades).
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
 * Valida que una aserción evalúe estrictamente a 'true'.
 */
export type Expect<T extends true> = T;

/**
 * Valida asignabilidad relacional (subtipado Actual <= Expected).
 * Retorna 'true' si Actual es asignable a Expected, o 'false' en caso contrario.
 */
export type AssertAssignable<Actual, Expected> = Actual extends Expected
  ? true
  : false;

/**
 * Contenedor 0-runtime bytes para suites de pruebas estáticas de tipos.
 */
export type TypeSuite<T extends readonly unknown[]> = T;
