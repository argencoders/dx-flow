import { test } from "node:test";
import { Expect } from "../core/testing.types.js";
import {
  IsPlainArray,
  IsPlainObject,
  ValidateKeys,
} from "./state-discriminators.js";

test("Discriminadores: Validación atómica de IsPlainObject", () => {
  function testFlujosPositivos() {
    interface DtoComun {
      id: string;
      edad: number;
    }
    type ObjetoLiteral = { token: string };
    interface ObjetoVacio {}

    // ✅ REQUISITO: Estructuras de datos puros deben resolver estrictamente a true
    type TestDto = Expect<IsPlainObject<DtoComun>, true>;
    type TestLiteral = Expect<IsPlainObject<ObjetoLiteral>, true>;
    type TestVacio = Expect<IsPlainObject<ObjetoVacio>, true>;
  }

  function testFlujosNegativos() {
    // ❌ REQUISITO: Debe identificar y rechazar tipos nativos integrados del lenguaje
    type TestDate = Expect<IsPlainObject<Date>, false>;
    type TestRegExp = Expect<IsPlainObject<RegExp>, false>;
    type TestMap = Expect<IsPlainObject<Map<string, number>>, false>;
    type TestSet = Expect<IsPlainObject<Set<string>>, false>;

    // ❌ REQUISITO: Debe rechazar arreglos y colecciones indexadas
    type TestArray = Expect<IsPlainObject<string[]>, false>;
    type TestTuple = Expect<IsPlainObject<[number, string]>, false>;

    // ❌ REQUISITO: Debe rechazar funciones y primitivos sueltos
    type TestFuncion = Expect<IsPlainObject<() => void>, false>;
    type TestString = Expect<IsPlainObject<string>, false>;
    type TestNumber = Expect<IsPlainObject<number>, false>;
  }
});

test("Discriminadores: Validación atómica de IsPlainArray", () => {
  function testFlujosPositivos() {
    type ListaStrings = string[];
    type ListaNumerosReadonly = readonly number[];

    // ✅ REQUISITO: Los arreglos mutables e inmutables deben resolver a true de forma explícita
    type TestArray = Expect<IsPlainArray<ListaStrings>, true>;
    type TestArrayReadonly = Expect<IsPlainArray<ListaNumerosReadonly>, true>;
  }

  function testFlujosNegativos() {
    interface DtoComun {
      id: string;
    }

    // ❌ REQUISITO: Debe rechazar objetos planos, tipos nativos y primitivos
    type TestObjeto = Expect<IsPlainArray<DtoComun>, false>;
    type TestDate = Expect<IsPlainArray<Date>, false>;
    type TestString = Expect<IsPlainArray<string>, false>;
    type TestFuncion = Expect<IsPlainArray<() => void>, false>;
  }
});

test("Discriminadores: Validación atómica de ValidateKeys", () => {
  function testFlujosPositivos() {
    interface LlavesNormales {
      id: string;
      edad: number;
    }

    interface LlavesNumericas {
      1: string;
      2: string;
    }

    // ✅ REQUISITO: Llaves estándar de tipo string deben pasar por defecto
    type TestStrings = Expect<ValidateKeys<LlavesNormales>, true>;

    // ✅ REQUISITO: Se puede cambiar el criterio a string | number de forma interactiva
    type TestNumeros = Expect<
      ValidateKeys<LlavesNumericas, string | number>,
      true
    >;
  }

  function testFlujosNegativos() {
    const miSymbol = Symbol("id");
    interface EstructuraConSymbol {
      [miSymbol]: string;
      nombre: string;
    }

    interface EstructuraConNumeros {
      1: string;
      nombre: string;
    }

    // ❌ REQUISITO: Debe rechazar si contiene llaves de tipo Symbol bajo el criterio por defecto (string)
    type TestFallaSymbol = Expect<ValidateKeys<EstructuraConSymbol>, false>;

    // ❌ REQUISITO: Debe rechazar llaves numéricas si el criterio exige estrictamente cadenas (string)
    type TestFallaNumeros = Expect<
      ValidateKeys<EstructuraConNumeros, string>,
      false
    >;
  }
});
