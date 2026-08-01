import { test } from "node:test";
import { Expect } from "./types-testing.js";
import {
  ValidateObjectKeys,
  ERR_NOMENCLATURA_INVALIDA,
} from "./object-keys.js";

test("Nomenclatura: Validación con la estrategia 'default'", () => {
  function testFlujos() {
    const miSymbol = Symbol("id");
    interface EstadoMixto {
      id: string;
      100: number;
      [miSymbol]: boolean;
    }

    // ✅ REQUISITO: Por defecto debe aceptar cualquier tipo de llave primitiva nativa
    type TestOk = Expect<
      ValidateObjectKeys<EstadoMixto, "default">,
      EstadoMixto
    >;
  }
});

test("Nomenclatura: Validación con la estrategia 'string'", () => {
  function testFlujosPositivos() {
    interface SoloStrings {
      nombre: string;
      correo: string;
    }
    // ✅ REQUISITO: Si todas las llaves son strings, pasa intacto
    type TestOk = Expect<
      ValidateObjectKeys<SoloStrings, "string">,
      SoloStrings
    >;
  }

  function testFlujosNegativos() {
    interface ConLlaveNumerica {
      id: string;
      1: number; // ❌ Rompe el criterio string
    }
    // ❌ REQUISITO: Debe rechazar la estructura si contiene llaves no-string
    type TestFalla = Expect<
      ValidateObjectKeys<ConLlaveNumerica, "string">,
      ERR_NOMENCLATURA_INVALIDA
    >;
  }
});

test("Nomenclatura: Validación con la estrategia 'SCREAMING_SNAKE'", () => {
  function testFlujosPositivos() {
    interface CasingCorrecto {
      MUTATION_NAME: string;
      SET_USER_DATA: number;
      RESET: boolean;
    }
    // ✅ REQUISITO: Estructuras con mayúsculas y guiones bajos correctos pasan intactas
    type TestOk = Expect<
      ValidateObjectKeys<CasingCorrecto, "SCREAMING_SNAKE">,
      CasingCorrecto
    >;
  }

  function testFlujosNegativos() {
    interface ConMinuscula {
      SET_user: string; // ❌ Letras minúsculas prohibidas
    }
    interface ConEspacio {
      "SET USER": string; // ❌ Espacios prohibidos
    }
    interface ConGuionBajoHuerfano {
      _RESET: string; // ❌ Guiones bajos iniciales/finales prohibidos
    }

    // ❌ REQUISITO: Cada una debe colapsar exactamente al token de error de nomenclatura
    type TestFallaMinuscula = Expect<
      ValidateObjectKeys<ConMinuscula, "SCREAMING_SNAKE">,
      ERR_NOMENCLATURA_INVALIDA
    >;
    type TestFallaEspacio = Expect<
      ValidateObjectKeys<ConEspacio, "SCREAMING_SNAKE">,
      ERR_NOMENCLATURA_INVALIDA
    >;
    type TestFallaHuerfano = Expect<
      ValidateObjectKeys<ConGuionBajoHuerfano, "SCREAMING_SNAKE">,
      ERR_NOMENCLATURA_INVALIDA
    >;
  }
});
