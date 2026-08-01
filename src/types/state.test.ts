import { test } from "node:test";
import { IsValidState } from "./state.js";

type AssertValidState<T extends expected, expected = IsValidState<T>> = T;
// Helper genérico e independiente para testing de tipos
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

test("Validación de límite estricto de nivel", () => {
  type ObjetoPrueba = {
    a: string;
    b: {
      c: number; // Nivel 2
    };
  };

  // ✅ Ahora sí: Como MaxLevel es 1, esta estructura colapsa correctamente a 'never'
  type Resultado = IsValidState<ObjetoPrueba, string, any, 1>;

  // Esta aserción compilará perfectamente en tu editor porque Resultado es 'never'
  type TestNivelEstricto = Expect<Equal<Resultado, never>>;
});

test("Verificación estática de tipos para IsValidState con Criterios Dinámicos", () => {
  // Estas funciones no se ejecutan. El compilador TS las valida estáticamente.

  function probarCriterioPorDefecto() {
    interface EstadoComun {
      id: string;
      metadatos: { unNivel: number }; // Nivel 2
    }

    interface EstadoExcesivo {
      id: string;
      config: { seguridad: { jwt: { token: string } } }; // Nivel 4
    }

    // ✅ REQUISITO: EstadoComun debe retornar el mismo tipo (Es válido)
    type TestValido = Expect<Equal<IsValidState<EstadoComun>, EstadoComun>>;

    // ❌ REQUISITO: EstadoExcesivo DEBE retornar 'never' porque supera el MaxLevel por defecto (2)
    // Ahora, si el motor fallara y NO devolviera 'never', esta línea arrojaría error instantáneo.
    type TestInvalido = Expect<Equal<IsValidState<EstadoExcesivo>, never>>;
  }

  function probarCambioDeCriterioMaxLevel() {
    interface EstadoProfundo {
      a: { b: { c: { d: string } } }; // Nivel 4
    }

    // ✅ Modificamos el criterio a MaxLevel = 4, por lo que debe retornar el tipo original (No never)
    type Resultado = IsValidState<EstadoProfundo, string, any, 4>;
    type TestCambioNivel = Expect<Equal<Resultado, EstadoProfundo>>;
  }

  function probarCambioDeCriterioValores() {
    type SoloPrimitivosFlat = string | number | boolean | null;

    // Aplicamos el criterio estricto sobre ambas interfaces
    type ResultadoValido = IsValidState<
      EstadoPlanoValido,
      string,
      SoloPrimitivosFlat,
      1
    >;
    type ResultadoInvalido = IsValidState<
      EstadoConObjetoProhibido,
      string,
      SoloPrimitivosFlat,
      1
    >;

    interface EstadoPlanoValido {
      id: string;
      activo: boolean;
    }
    interface EstadoConObjetoProhibido {
      id: string;
      info: { fecha: string };
    }

    // ✅ REQUISITO: El plano es válido, por lo que devuelve la misma interfaz
    type TestOk = Expect<Equal<ResultadoValido, EstadoPlanoValido>>;

    // ❌ REQUISITO: El que tiene el objeto prohibido DEBE devolver 'never'
    // Al usar 'never' aquí directamente, no necesitas usar @ts-expect-error.
    // Si el motor falla y NO devuelve never, esta línea fallará por sí sola de forma elegante.
    type TestErrorObjeto = Expect<Equal<ResultadoInvalido, never>>;
  }

  function probarCambioDeCriterioLlaves() {
    // Definimos un criterio donde las llaves de primer nivel DEBEN ser de tipo Symbol
    const miSymbol = Symbol("id");
    interface EstadoConSymbol {
      [miSymbol]: string;
    }

    type CriterioSymbol<T> = IsValidState<T, symbol, any, 1>;

    type Ok = AssertValidState<
      EstadoConSymbol,
      CriterioSymbol<EstadoConSymbol>
    >;
  }
});
