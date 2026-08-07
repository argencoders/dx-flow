import { test } from "node:test";
import { Expect } from "../core/testing.types.js";
import { Enumerate, Decrement } from "./state-counter.js";

test("Profundidad: Validación atómica del Contador Matemático", () => {
  function testConversorNumerico() {
    type TuplaDeTres = Enumerate<3>;

    // ✅ REQUISITO: Enumerate debe convertir el número 3 en una tupla de longitud 3
    type TestLongitud = Expect<TuplaDeTres["length"], 3>;
  }

  function testRestaDeNiveles() {
    type TuplaDeDos = Enumerate<2>; // [any, any]
    type TuplaRestada = Decrement<TuplaDeDos>; // [any]

    // ✅ REQUISITO: Decrement debe restar exactamente un elemento a la tupla
    type TestResta = Expect<TuplaRestada["length"], 1>;

    // ✅ REQUISITO: Restar a una tupla vacía debe devolver una tupla vacía de longitud 0 de forma segura
    type TestRestaVacia = Expect<Decrement<[]>, []>;
  }
});
