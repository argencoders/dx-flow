import { test } from "node:test";
import { Expect } from "./types-testing.js";
import { Enumerate } from "./state-counter.js";
import {
  CheckObjectDeep,
  ERR_PROFUNDIDAD_EXCEDIDA,
  ERR_LLAVES_INVALIDAS_INTERNAS,
} from "./state-objects.js";

test("Profundidad: Validación atómica de Recorredor de Objetos Anidados", () => {
  function testProfundidadPermitida() {
    interface EstructuraDosNiveles {
      id: string;
      config: {
        tema: string; // Nivel 2
      };
    }

    // Inicializamos un contador de longitud 2
    type ContadorNivel2 = Enumerate<2>;

    // ✅ REQUISITO: Debe pasar intacto ya que la estructura se mantiene en el límite permitido (Nivel 2)
    type ResultadoOk = CheckObjectDeep<
      EstructuraDosNiveles,
      string,
      ContadorNivel2
    >;
    type TestNivelOk = Expect<ResultadoOk, EstructuraDosNiveles>;
  }

  function testProfundidadExcedida() {
    interface EstructuraProfunda {
      id: string;
      config: {
        seguridad: {
          jwt: string; // Nivel 3
        };
      };
    }

    // Inicializamos un contador de longitud 1
    type ContadorNivel1 = Enumerate<1>;

    // ❌ REQUISITO: Debe colapsar exactamente al token de profundidad excedida
    type ResultadoExcedido = CheckObjectDeep<
      EstructuraProfunda,
      string,
      ContadorNivel1
    >;
    type TestNivelError = Expect<ResultadoExcedido, ERR_PROFUNDIDAD_EXCEDIDA>;
  }

  function testLlavesInternasInvalidas() {
    const miSymbol = Symbol("interno");
    interface EstructuraConSymbolInterno {
      id: string;
      metadatos: {
        [miSymbol]: string; // Llave inválida en nivel 2
        nombre: string;
      };
    }

    type ContadorNivel3 = Enumerate<3>;

    // ❌ REQUISITO: Debe propagar el error si encuentra una llave que viola el criterio de strings en subcapas
    type ResultadoLlaves = CheckObjectDeep<
      EstructuraConSymbolInterno,
      string,
      ContadorNivel3
    >;
    type TestLlavesError = Expect<
      ResultadoLlaves,
      ERR_LLAVES_INVALIDAS_INTERNAS
    >;
  }
});
