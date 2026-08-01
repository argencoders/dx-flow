import { test } from "node:test";
import { Expect } from "./types-testing.js";
import { IsValidState } from "./state-deep.js";
import {
  ERR_PROFUNDIDAD_EXCEDIDA,
  ERR_LLAVES_INVALIDAS_INTERNAS,
} from "./state-objects.js";
import { TypeError } from "./types-testing.js";

type ERR_VALOR_PROHIBIDO =
  TypeError<"❌ ERROR: Se detectó un tipo de dato no permitido en los valores terminales del estado.">;

test("Validador Definitivo: Escenarios de Éxito Completos", () => {
  function testArbolesGrandesOk() {
    interface MiEstadoProduccion {
      id: string;
      informacion: {
        version: number;
        activo: boolean;
      };
      fechas: Date[];
    }

    // ✅ REQUISITO: Un DTO robusto de producción debe ser aprobado devolviendo el mismo tipo intacto
    type TestEstructuraOk = Expect<
      IsValidState<MiEstadoProduccion>,
      MiEstadoProduccion
    >;
  }
});

test("Validador Definitivo: Escenarios de Fallo por Restricciones Profundas", () => {
  function testFalloMaxLevel() {
    interface EstadoDemasiadoProfundo {
      id: string;
      modulo: { submodulo: { componente: { configuracion: string } } }; // Nivel 4 (> MaxLevel por defecto 2)
    }

    // ❌ REQUISITO: Debe propagar el error de profundidad excedida hasta la raíz pública
    type Resultado = IsValidState<EstadoDemasiadoProfundo>;
    type TestErrorProfundidad = Expect<Resultado, ERR_PROFUNDIDAD_EXCEDIDA>;
  }

  function testFalloValoresTerminales() {
    type SoloStringsYNumeros = string | number;

    interface EstadoConNativoOculto {
      id: string;
      detalles: {
        creadoEn: Date; // 🎯 Captura el Date anidado cuando el desarrollador restringe TValue
      };
    }

    // ❌ REQUISITO: El pipeline recursivo debe capturar el valor ilegal e informarlo correctamente
    type Resultado = IsValidState<
      EstadoConNativoOculto,
      string,
      SoloStringsYNumeros,
      true,
      3
    >;
    type TestErrorValor = Expect<Resultado, ERR_VALOR_PROHIBIDO>;
  }

  function testFalloLlavesOcultas() {
    const miSymbol = Symbol("oculto");
    interface EstadoConSymbolOculto {
      id: string;
      opciones: {
        [miSymbol]: string; // Llave ilegal metida en el nivel 2
      };
    }

    // ❌ REQUISITO: Debe propagar que las llaves internas rompieron el criterio por defecto (string)
    type Resultado = IsValidState<EstadoConSymbolOculto>;
    type TestErrorLlaves = Expect<Resultado, ERR_LLAVES_INVALIDAS_INTERNAS>;
  }
});
