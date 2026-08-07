import type {
  Equal,
  Expect,
  AssertAssignable,
  TypeSuite,
} from "./testing.types.js";

/**
 * SUITE DE PRUEBAS DE TIPOS (0 Bytes Runtime, 0 Warnings ts(6133))
 * Se valida directamente mediante `npx tsc --noEmit` o la IDE.
 */
export type TestSuiteInfraestructuraTipos = TypeSuite<
  [
    // ===================================================================
    // 1. DUALIDAD: Identidad Estricta (Equal) vs Asignabilidad (AssertAssignable)
    // ===================================================================

    // ✅ Igualdad Estricta: Ambas estructuras son idénticas en mutabilidad
    Expect<Equal<{ readonly id: number }, { readonly id: number }>>,

    // ✅ Asignabilidad: Mutable ES asignable a Readonly (Subtipado permitido)
    Expect<AssertAssignable<{ id: number }, { readonly id: number }>>,

    // ✅ Captura de Falso Positivo: Equal DETECTA la diferencia de 'readonly' donde AssertAssignable no
    Expect<Equal<Equal<{ id: number }, { readonly id: number }>, false>>,

    // ===================================================================
    // 2. PRUEBAS DE OPCIONALIDAD Y ESTRUCTURA
    // ===================================================================

    // ✅ Identidad de opcionales
    Expect<Equal<{ token?: string }, { token?: string }>>,

    // ✅ Opcionalidad explícita vs implícita (retorna false en Equal)
    Expect<Equal<Equal<{ a?: string }, { a: string | undefined }>, false>>,
  ]
>;
