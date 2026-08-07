import { test } from "node:test";
import { Equal, AssertAssignable, TypeError } from "./testing.types.js";

test("Infraestructura de Testing: Validación de Equal y Expect", () => {
  // Bloque estático: No se ejecuta en runtime, se valida en compilación (tsc)

  function testFlujosPositivos() {
    // Caso A: Primitivos idénticos (Usando tu nuevo formato explícito)
    type CasoPrimitivo = AssertAssignable<Equal<string, string>, true>;

    // Caso B: Estructuras de objetos idénticas
    type CasoObjeto = AssertAssignable<Equal<{ id: number }, { id: number }>, true>;

    // Caso C: Respeto a modificadores opcionales idénticos
    type CasoOpcional = AssertAssignable<
      Equal<{ token?: string }, { token?: string }>,
      true
    >;
  }

  function testFlujosNegativos() {
    // Caso D: Diferenciar tipos distintos (Debe retornar false)
    type ErrorTiposDistintos = AssertAssignable<Equal<string, number>, false>;

    // Caso E: Estricto con el modificador Readonly
    type ErrorReadonly = AssertAssignable<
      Equal<{ id: number }, { readonly id: number }>,
      false
    >;

    // Caso F: Estricto con la opcionalidad implícita vs explícita (¡CORREGIDO!)
    // Ahora, gracias a la remoción homórfica, el tipo de abajo da false de verdad.
    type ErrorOpcionalidad = AssertAssignable<
      Equal<{ a?: string }, { a: string | undefined }>,
      false
    >;
  }
});

test("Infraestructura de Testing: Validación de TypeError", () => {
  function testValidacionTokens() {
    type MiMensaje = "❌ ERROR: Formato inválido";
    type ErrorInstanciado = TypeError<MiMensaje>;

    // Verificamos que el token conserve el mensaje exacto en su firma estructural
    type TestEstructura = AssertAssignable<
      Equal<
        ErrorInstanciado,
        { readonly __type_error__: "❌ ERROR: Formato inválido" }
      >,
      true
    >;

    // Un objeto común no es asignable al token de error, provocando una falla limpia en @ts-expect-error
    // @ts-expect-error - El tipo intenta validar que no cualquier estructura pase por un TypeError
    const dispararAlerta: ErrorInstanciado = { algo: "distinto" };
  }
});
