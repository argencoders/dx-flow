import type {
  Equal,
  Expect,
  ExpectEqual,
  AssertAssignable,
  TypeSuite,
} from "./testing.types.js";

/**
 * SUITE DE PRUEBAS ESTÁTICAS DE INFRAESTRUCTURA DE TIPOS (0 Bytes Runtime)
 * Valida el comportamiento estricto de Equal, Expect, ExpectEqual y AssertAssignable.
 */
export type TestSuiteInfraestructuraTipos = TypeSuite<
  [
    // ===================================================================
    // 1. ASERCIÓN ESTRICTA DIRECTA (ExpectEqual)
    // ===================================================================

    // ✅ Primitivos idénticos
    ExpectEqual<string, string>,

    // ✅ Estructuras de objetos e inmutabilidad idénticas
    ExpectEqual<{ readonly id: number }, { readonly id: number }>,

    // ===================================================================
    // 2. DUALIDAD: Identidad Estricta (Equal) vs Asignabilidad (AssertAssignable)
    // ===================================================================

    // ✅ Asignabilidad Relacional (Subtipado mutable -> readonly permitido)
    AssertAssignable<{ id: number }, { readonly id: number }>,

    // ✅ Captura de Falso Positivo: ExpectEqual y Equal DETECTAN la diferencia de 'readonly'
    Expect<Equal<ExpectEqual<{ id: number }, { readonly id: number }>, false>>,
    Expect<Equal<Equal<{ id: number }, { readonly id: number }>, false>>,

    // ===================================================================
    // 3. PRUEBAS DE OPCIONALIDAD Y ESTRUCTURA
    // ===================================================================

    // ✅ Identidad de opcionales idénticos
    ExpectEqual<{ token?: string }, { token?: string }>,

    // ✅ Opcionalidad explícita vs implícita (retorna false en ExpectEqual)
    Expect<
      Equal<ExpectEqual<{ a?: string }, { a: string | undefined }>, false>
    >,
  ]
>;
