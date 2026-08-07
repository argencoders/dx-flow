import { test } from "node:test";
import { AssertAssignable } from "../core/testing.types.js";
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
    type TestDto = AssertAssignable<IsPlainObject<DtoComun>, true>;
    type TestLiteral = AssertAssignable<IsPlainObject<ObjetoLiteral>, true>;
    type TestVacio = AssertAssignable<IsPlainObject<ObjetoVacio>, true>;
  }

  function testFlujosNegativos() {
    // ❌ REQUISITO: Debe identificar y rechazar tipos nativos integrados del lenguaje
    type TestDate = AssertAssignable<IsPlainObject<Date>, false>;
    type TestRegExp = AssertAssignable<IsPlainObject<RegExp>, false>;
    type TestMap = AssertAssignable<IsPlainObject<Map<string, number>>, false>;
    type TestSet = AssertAssignable<IsPlainObject<Set<string>>, false>;

    // ❌ REQUISITO: Debe rechazar arreglos y colecciones indexadas
    type TestArray = AssertAssignable<IsPlainObject<string[]>, false>;
    type TestTuple = AssertAssignable<IsPlainObject<[number, string]>, false>;

    // ❌ REQUISITO: Debe rechazar funciones y primitivos sueltos
    type TestFuncion = AssertAssignable<IsPlainObject<() => void>, false>;
    type TestString = AssertAssignable<IsPlainObject<string>, false>;
    type TestNumber = AssertAssignable<IsPlainObject<number>, false>;
  }
});

test("Discriminadores: Validación atómica de IsPlainArray", () => {
  function testFlujosPositivos() {
    type ListaStrings = string[];
    type ListaNumerosReadonly = readonly number[];

    // ✅ REQUISITO: Los arreglos mutables e inmutables deben resolver a true de forma explícita
    type TestArray = AssertAssignable<IsPlainArray<ListaStrings>, true>;
    type TestArrayReadonly = AssertAssignable<IsPlainArray<ListaNumerosReadonly>, true>;
  }

  function testFlujosNegativos() {
    interface DtoComun {
      id: string;
    }

    // ❌ REQUISITO: Debe rechazar objetos planos, tipos nativos y primitivos
    type TestObjeto = AssertAssignable<IsPlainArray<DtoComun>, false>;
    type TestDate = AssertAssignable<IsPlainArray<Date>, false>;
    type TestString = AssertAssignable<IsPlainArray<string>, false>;
    type TestFuncion = AssertAssignable<IsPlainArray<() => void>, false>;
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
    type TestStrings = AssertAssignable<ValidateKeys<LlavesNormales>, true>;

    // ✅ REQUISITO: Se puede cambiar el criterio a string | number de forma interactiva
    type TestNumeros = AssertAssignable<
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
    type TestFallaSymbol = AssertAssignable<ValidateKeys<EstructuraConSymbol>, false>;

    // ❌ REQUISITO: Debe rechazar llaves numéricas si el criterio exige estrictamente cadenas (string)
    type TestFallaNumeros = AssertAssignable<
      ValidateKeys<EstructuraConNumeros, string>,
      false
    >;
  }
});
