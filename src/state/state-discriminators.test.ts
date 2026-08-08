import { test } from "node:test";
import { ExpectEqual } from "../core/testing.types.js";
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
    type TestDto = ExpectEqual<IsPlainObject<DtoComun>, true>;
    type TestLiteral = ExpectEqual<IsPlainObject<ObjetoLiteral>, true>;
    type TestVacio = ExpectEqual<IsPlainObject<ObjetoVacio>, true>;
  }

  function testFlujosNegativos() {
    // ❌ REQUISITO: Debe identificar y rechazar tipos nativos integrados del lenguaje
    type TestDate = ExpectEqual<IsPlainObject<Date>, false>;
    type TestRegExp = ExpectEqual<IsPlainObject<RegExp>, false>;
    type TestMap = ExpectEqual<IsPlainObject<Map<string, number>>, false>;
    type TestSet = ExpectEqual<IsPlainObject<Set<string>>, false>;

    // ❌ REQUISITO: Debe rechazar arreglos y colecciones indexadas
    type TestArray = ExpectEqual<IsPlainObject<string[]>, false>;
    type TestTuple = ExpectEqual<IsPlainObject<[number, string]>, false>;

    // ❌ REQUISITO: Debe rechazar funciones y primitivos sueltos
    type TestFuncion = ExpectEqual<IsPlainObject<() => void>, false>;
    type TestString = ExpectEqual<IsPlainObject<string>, false>;
    type TestNumber = ExpectEqual<IsPlainObject<number>, false>;
  }
});

test("Discriminadores: Validación atómica de IsPlainArray", () => {
  function testFlujosPositivos() {
    type ListaStrings = string[];
    type ListaNumerosReadonly = readonly number[];

    // ✅ REQUISITO: Los arreglos mutables e inmutables deben resolver a true de forma explícita
    type TestArray = ExpectEqual<IsPlainArray<ListaStrings>, true>;
    type TestArrayReadonly = ExpectEqual<
      IsPlainArray<ListaNumerosReadonly>,
      true
    >;
  }

  function testFlujosNegativos() {
    interface DtoComun {
      id: string;
    }

    // ❌ REQUISITO: Debe rechazar objetos planos, tipos nativos y primitivos
    type TestObjeto = ExpectEqual<IsPlainArray<DtoComun>, false>;
    type TestDate = ExpectEqual<IsPlainArray<Date>, false>;
    type TestString = ExpectEqual<IsPlainArray<string>, false>;
    type TestFuncion = ExpectEqual<IsPlainArray<() => void>, false>;
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
    type TestStrings = ExpectEqual<ValidateKeys<LlavesNormales>, true>;

    // ✅ REQUISITO: Se puede cambiar el criterio a string | number de forma interactiva
    type TestNumeros = ExpectEqual<
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
    type TestFallaSymbol = ExpectEqual<
      ValidateKeys<EstructuraConSymbol>,
      false
    >;

    // ❌ REQUISITO: Debe rechazar llaves numéricas si el criterio exige estrictamente cadenas (string)
    type TestFallaNumeros = ExpectEqual<
      ValidateKeys<EstructuraConNumeros, string>,
      false
    >;
  }
});
