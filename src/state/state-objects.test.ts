import { test } from "node:test";
import { Expect } from "../core/testing.types.js";
import { Enumerate } from "./state-counter.js";
import { CheckObjectDeep, ERR_PROFUNDIDAD_EXCEDIDA } from "./state-objects.js";
import { ERR_LLAVES_INVALIDAS_INTERNAS } from "./state-objects.js";

test("Profundidad: Validación atómica de Recorredor de Objetos Anidados", () => {
  function testProfundidadPermitida() {
    interface EstructuraDosNiveles {
      id: string;
      config: {
        tema: string; // Nivel 2
      };
    }

    type ContadorNivel2 = Enumerate<2>;

    // ✅ REQUISITO: Pasa limpio usando por defecto el validador de llaves integrado
    type ResultadoOk = CheckObjectDeep<EstructuraDosNiveles, ContadorNivel2>;
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

    type ContadorNivel1 = Enumerate<1>;

    // ❌ REQUISITO: Sigue cazando los excesos de profundidad perfectamente
    type ResultadoExcedido = CheckObjectDeep<
      EstructuraProfunda,
      ContadorNivel1
    >;
    type TestNivelError = Expect<ResultadoExcedido, ERR_PROFUNDIDAD_EXCEDIDA>;
  }

  function testLlavesInternasInvalidas() {
    interface EstructuraConMinusculasInternas {
      ID: string;
      CONFIGURACION: {
        temaInvalido: string; // ❌ Violará SCREAMING_SNAKE en el subnivel
      };
    }

    type ContadorNivel3 = Enumerate<3>;

    // 🎯 REQUISITO INYECTADO: Pasamos el contador de nivel como 2do argumento y la estrategia "SCREAMING_SNAKE" como 3ro
    type Resultado = CheckObjectDeep<
      EstructuraConMinusculasInternas,
      ContadorNivel3,
      "SCREAMING_SNAKE"
    >;
    type TestLlavesError = Expect<Resultado, ERR_LLAVES_INVALIDAS_INTERNAS>;
  }
});
