import { test } from "node:test";
import { Expect } from "../core/testing.types.js";
import { TypeError } from "../core/testing.types.js";
import { CheckArrayLeaf } from "./state-arrays.js";

type ERR_VALOR_PROHIBIDO =
  TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

test("Profundidad: Validación atómica de Recorredor de Arrays", () => {
  function testFlujoPorDefecto() {
    type ListaNormal = string[];
    type ListaReadonly = readonly number[];

    // ✅ REQUISITO: Bajo condiciones normales, los arrays puros de primitivos válidos deben pasar intactos
    type TestArrayOk = Expect<CheckArrayLeaf<ListaNormal>, ListaNormal>;
    type TestArrayReadonlyOk = Expect<
      CheckArrayLeaf<ListaReadonly>,
      ListaReadonly
    >;
  }

  function testFlujoArraysProhibidos() {
    type ListaNormal = string[];

    // ❌ REQUISITO: Si AllowArrays es false, cualquier array debe retornar el token de error
    type ResultadoProhibido = CheckArrayLeaf<ListaNormal, any, false>;
    type TestArraysBloqueados = Expect<ResultadoProhibido, ERR_VALOR_PROHIBIDO>;
  }

  function testFlujoElementosProhibidos() {
    // Criterio: Solo aceptamos números en el estado
    type SoloNumeros = number;
    type ListaTramposa = string[]; // Contiene cadenas, violando el criterio 'SoloNumeros'

    // ❌ REQUISITO: Debe inspeccionar el interior del array y rechazarlo si el tipo de elemento no cumple
    type ResultadoElementosIlegales = CheckArrayLeaf<
      ListaTramposa,
      SoloNumeros,
      true
    >;
    type TestElementosBloqueados = Expect<
      ResultadoElementosIlegales,
      ERR_VALOR_PROHIBIDO
    >;
  }
});
