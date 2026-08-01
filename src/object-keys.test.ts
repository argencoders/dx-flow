import { test } from "node:test";
import { Expect, Equal } from "./types-testing.js";
import {
  ValidateObjectKeys,
  StringToAlphabet,
  IsValidStringByAlphabet,
  ERR_NOMENCLATURA_INVALIDA,
} from "./object-keys.js";

// ============================================================================
// 🎯 TEST 1: EXTRACCIÓN DE ALFABETOS
// ============================================================================
test("Nomenclatura: Validación atómica de StringToAlphabet", () => {
  function testExtraccion() {
    type AlfabetoPrueba = StringToAlphabet<"ABC">;
    type UnionEsperada = "A" | "B" | "C";

    type TestOk = Expect<Equal<AlfabetoPrueba, UnionEsperada>, true>;

    type AlfabetoUnion = StringToAlphabet<"XY" | "Z">;
    type UnionMultipleEsperada = "X" | "Y" | "Z";

    type TestUnionOk = Expect<
      Equal<AlfabetoUnion, UnionMultipleEsperada>,
      true
    >;
  }
});

// ============================================================================
// 🎯 TEST 2: VALIDADOR GRAMATICAL RECURSIVO (¡NUEVO!)
// ============================================================================
test("Nomenclatura: Validación atómica de IsValidStringByAlphabet", () => {
  function testFiltroCaracteres() {
    type AlfabetoBinario = StringToAlphabet<"01">;

    // ✅ REQUISITO: Cadenas compuestas puramente por caracteres del alfabeto dan true
    type TestBinarioValido = Expect<
      IsValidStringByAlphabet<"101001", AlfabetoBinario>,
      true
    >;

    // ❌ REQUISITO: Si se cuela un solo carácter ajeno al alfabeto, da false
    type TestBinarioInvalido = Expect<
      IsValidStringByAlphabet<"1010201", AlfabetoBinario>,
      false
    >;
  }
});

// ============================================================================
// 🎯 TEST 3: VALIDACIÓN DE REGLAS POR OMISIÓN ("default" y "string")
// ============================================================================
test("Nomenclatura: Validación con la estrategia 'default' y 'string'", () => {
  function testFlujos() {
    const miSymbol = Symbol("id");
    interface EstadoMixto {
      id: string;
      100: number;
      [miSymbol]: boolean;
    }

    type TestDefaultOk = Expect<
      ValidateObjectKeys<EstadoMixto, "default">,
      EstadoMixto
    >;

    interface SoloStrings {
      nombre: string;
      correo: string;
    }
    type TestStringOk = Expect<
      ValidateObjectKeys<SoloStrings, "string">,
      SoloStrings
    >;

    interface ConNumero {
      id: string;
      1: number;
    }
    type TestStringFalla = Expect<
      ValidateObjectKeys<ConNumero, "string">,
      ERR_NOMENCLATURA_INVALIDA
    >;
  }
});

// ============================================================================
// 🎯 TEST 4: ESTRATEGIA SCREAMING_SNAKE EVOLUCIONADA
// ============================================================================
test("Nomenclatura: Validación con la estrategia 'SCREAMING_SNAKE'", () => {
  function testFlujosPositivos() {
    interface CasingCorrecto {
      MUTATION_NAME: string;
      SET_USER_2: number; // ✅ Ahora los números intermedios son perfectamente válidos
      RESET: boolean;
    }
    type TestOk = Expect<
      ValidateObjectKeys<CasingCorrecto, "SCREAMING_SNAKE">,
      CasingCorrecto
    >;
  }

  function testFlujosNegativos() {
    interface ConMinuscula {
      SET_user: string;
    }
    interface ConEspacio {
      "SET USER": string;
    }
    interface ConGuionBajoHuerfano {
      _RESET: string;
    }

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

// ============================================================================
// 🎯 TEST 5: EJEMPLO DE EXTENSIÓN DE INTERFAZ (¡NUEVO!)
// ============================================================================

// Simulamos que el desarrollador extiende la interfaz nativa en su propio archivo
declare module "./object-keys.js" {
  interface KeyStrategy<K extends string | number | symbol> {
    // Agregamos un validador personalizado que exija que las llaves usen solo las letras 'A', 'B' o 'C'
    SOLO_ABC: K extends string
      ? IsValidStringByAlphabet<K, StringToAlphabet<"ABC">>
      : false;
  }
}

test("Nomenclatura: Validación mediante Extensión de Interfaz (SOLO_ABC)", () => {
  function testExtensionUsuario() {
    interface ObjetoValido {
      AAA: string;
      BC: number;
    }

    interface ObjetoInvalido {
      AAA: string;
      BCD: number; // ❌ La 'D' viola la nueva regla extendida por el usuario
    }

    // ✅ REQUISITO: La nueva estrategia inyectada figura de forma nativa en las opciones y valida con éxito
    type TestOk = Expect<
      ValidateObjectKeys<ObjetoValido, "SOLO_ABC">,
      ObjetoValido
    >;

    // ❌ REQUISITO: El motor procesa la nueva extensión y colapsa correctamente si se viola la regla
    type TestFalla = Expect<
      ValidateObjectKeys<ObjetoInvalido, "SOLO_ABC">,
      ERR_NOMENCLATURA_INVALIDA
    >;
  }
});
