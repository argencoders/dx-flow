import { test } from "node:test";
import { ExpectEqual } from "../core/testing.types.js";
import { IsValidState } from "./state-deep.js";
import { ERR_PROFUNDIDAD_EXCEDIDA } from "./state-objects.js";
import { ERR_NOMENCLATURA_INVALIDA } from "../nomenclature/object-keys.js";
import { TypeError } from "../core/errors.types.js";

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

    type TestEstructuraOk = ExpectEqual<
      IsValidState<MiEstadoProduccion>,
      MiEstadoProduccion
    >;
  }
});

test("Validador Definitivo: Escenarios de Fallo por Restricciones Profundas", () => {
  function testFalloMaxLevel() {
    interface EstadoDemasiadoProfundo {
      id: string;
      modulo: { submodulo: { componente: { configuracion: string } } }; // Nivel 4
    }

    type Resultado = IsValidState<EstadoDemasiadoProfundo>;
    type TestErrorProfundidad = ExpectEqual<
      Resultado,
      ERR_PROFUNDIDAD_EXCEDIDA
    >;
  }

  function testFalloValoresTerminales() {
    type SoloStringsYNumeros = string | number;

    interface EstadoConNativoOculto {
      id: string;
      detalles: {
        creadoEn: Date; // ❌ Date no pertenece a 'SoloStringsYNumeros'
      };
    }

    // 🎯 CORRECCIÓN: Respetamos la nueva firma pasando: TValue (SoloStringsYNumeros), AllowArrays (true), TCasing ("default"), MaxLevel (3)
    type Resultado = IsValidState<
      EstadoConNativoOculto,
      SoloStringsYNumeros,
      true,
      "default",
      3
    >;
    type TestErrorValor = ExpectEqual<Resultado, ERR_VALOR_PROHIBIDO>;
  }

  function testFalloLlavesOcultas() {
    interface EstadoConMinuscula {
      id_invalido: string; // ❌ Violará SCREAMING_SNAKE en la raíz
    }

    // 🎯 CORRECCIÓN: Configuramos la estrategia "SCREAMING_SNAKE" en el 4to parámetro
    type Resultado = IsValidState<
      EstadoConMinuscula,
      any,
      true,
      "SCREAMING_SNAKE"
    >;
    type TestErrorLlaves = ExpectEqual<Resultado, ERR_NOMENCLATURA_INVALIDA>;
  }
});
