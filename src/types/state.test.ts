import { test } from "node:test";
import { IsValidState } from "./state.js";

/**
 * Auxiliar de Aserción optimizado para TDD.
 * Valida la asignabilidad usando la restricción nativa del genérico.
 */
type AssertValidState<T extends expected, expected = IsValidState<T>> = T;

test("Verificación estática de tipos para IsValidState", () => {
  // Estas funciones no se ejecutan. El compilador TS validará los tipos en el editor.

  function flujoPositivo() {
    interface EstadoValido1 {
      usuarioId: string;
      monto: number;
    }

    interface EstadoValido2 {
      configuracion: { tema: string };
      datos: number[];
    }

    // El éxito es que estas líneas compilen limpiamente sin emitir errores
    type Test1 = AssertValidState<EstadoValido1>;
    type Test2 = AssertValidState<EstadoValido2>;
  }

  function flujoNegativo() {
    // Caso de Error A: Un array es rechazado porque string[] no extiende a 'never'
    // @ts-expect-error - El tipo string[] no cumple con la restricción 'never'
    type TestErrorArray = AssertValidState<string[]>;

    // Caso de Error B: Una función es rechazada por el mismo motivo
    // @ts-expect-error - Las funciones no son estados válidos
    type TestErrorFuncion = AssertValidState<() => void>;

    // Caso de Error C: Tipos primitivos sueltos son rechazados
    // @ts-expect-error - Los tipos primitivos no extienden a 'never'
    type TestErrorPrimitivo = AssertValidState<string>;

    // Caso de Error D: Estructuras con llaves de tipo Symbol son rechazadas
    const miSymbol = Symbol("test");
    interface EstadoConSymbol {
      [miSymbol]: string;
      idNormal: string;
    }
    // @ts-expect-error - Los objetos con símbolos no son serializables puros
    type TestErrorSymbol = AssertValidState<EstadoConSymbol>;
  }
});
