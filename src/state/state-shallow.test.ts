import { test } from "node:test";
import { ExpectEqual } from "../core/testing.types.js";
import {
  CheckStateShallow,
  ERR_RAIZ_DEBE_SER_OBJETO,
  ERR_ARREGLOS_PROHIBIDOS,
  ERR_LLAVES_INVALIDAS,
} from "./state-shallow.js";

test("Validador Superficial: Flujos Positivos en Nivel 1", () => {
  function testEstructurasValidas() {
    interface EstadoNormal {
      id: string;
      edad: number;
    }
    type ListaTags = string[];

    // ✅ REQUISITO: Un objeto con llaves string bajo criterios comunes debe retornar el mismo tipo
    type TestObjetoOk = ExpectEqual<
      CheckStateShallow<EstadoNormal, string, any, true>,
      EstadoNormal
    >;

    // ✅ REQUISITO: Un array raíz debe retornar el mismo tipo si AllowArrays es true
    type TestArrayOk = ExpectEqual<
      CheckStateShallow<ListaTags, string, any, true>,
      ListaTags
    >;
  }
});

test("Validador Superficial: Flujos Negativos y Mensajes de Error", () => {
  function testErroresDeRaiz() {
    // ❌ REQUISITO: Primitivos sueltos deben gatillar el error de objeto plano
    type ResultadoPrimitivo = CheckStateShallow<string, string, any, true>;
    type TestErrorPrimitivo = ExpectEqual<
      ResultadoPrimitivo,
      ERR_RAIZ_DEBE_SER_OBJETO
    >;

    // ❌ REQUISITO: Funciones raíz deben gatillar el mismo error
    type ResultadoFuncion = CheckStateShallow<() => void, string, any, true>;
    type TestErrorFuncion = ExpectEqual<
      ResultadoFuncion,
      ERR_RAIZ_DEBE_SER_OBJETO
    >;
  }

  function testErroresConfiguracion() {
    // ❌ REQUISITO: Si AllowArrays es false, un array raíz debe retornar su error específico
    type ResultadoArrayProhibido = CheckStateShallow<
      string[],
      string,
      any,
      false
    >;
    type TestErrorArray = ExpectEqual<
      ResultadoArrayProhibido,
      ERR_ARREGLOS_PROHIBIDOS
    >;
  }

  function testErroresDeLlaves() {
    const miSymbol = Symbol("id");
    interface EstadoConSymbol {
      [miSymbol]: string;
      nombre: string;
    }

    // ❌ REQUISITO: Llaves inválidas deben retornar su token específico
    type ResultadoLlaves = CheckStateShallow<
      EstadoConSymbol,
      string,
      any,
      true
    >;
    type TestErrorLlaves = ExpectEqual<ResultadoLlaves, ERR_LLAVES_INVALIDAS>;
  }
});
