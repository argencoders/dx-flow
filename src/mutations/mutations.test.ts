import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import {
  createReducer,
  defineMutations,
  PublicActions,
  PureMutationFn,
} from "./mutations.js";
import assert from "node:assert";

interface EstadoUsuario {
  nombre: string;
  edad: number;
}

test("Mutaciones - Etapa 1: Inferencia, inmutabilidad y Casing por defecto (SCREAMING_SNAKE)", () => {
  // Inicializamos usando la configuración por defecto
  const mutaciones = defineMutations<EstadoUsuario>();

  const acciones = mutaciones.create({
    INCREMENTAR_EDAD: (state) => {
      // @ts-expect-error - ERROR: Durante la declaración, state sigue protegido como inmutable
      state.edad = state.edad + 1;
      return { edad: state.edad + 1 };
    },

    CAMBIAR_NOMBRE: (state, nuevoNombre: string) => ({ nombre: nuevoNombre }),
  });

  function testFirmasResultantes() {
    type FirmaIncrementar = typeof acciones.INCREMENTAR_EDAD;
    type FirmaCambiarNombre = typeof acciones.CAMBIAR_NOMBRE;

    // ✅ REQUISITO CORREGIDO: El output de la factoría devuelve firmas limpias de tipos MUTABLES puros
    type EsperadoIncrementar = PureMutationFn<EstadoUsuario, unknown>;
    type EsperadoCambiarNombre = PureMutationFn<EstadoUsuario, string>;

    type Ok1 = Expect<FirmaIncrementar, EsperadoIncrementar>;
    type Ok2 = Expect<FirmaCambiarNombre, EsperadoCambiarNombre>;
  }

  // ❌ REQUISITO: Sigue bloqueando de forma localizada llaves que no cumplen con SCREAMING_SNAKE
  mutaciones.create({
    // @ts-expect-error
    cambiar_edad: (state) => state,
    OK: (state) => state,
  });
});

test("Mutaciones - Etapa 1: Cambio interactivo de Estrategia de Casing (string)", () => {
  // 🎯 Inyectamos la estrategia "string" como segundo parámetro genérico
  const mutacionesConCamel = defineMutations<EstadoUsuario, "string">();

  mutacionesConCamel.create({
    // ✅ REQUISITO: Permite camelCase gracias al cambio dinámico de estrategia
    cambiarEdad: (state) => ({ edad: state.edad + 1 }),
    nombreModificado: (state, n: string) => ({ nombre: n }),
  });

  // ❌ REQUISITO: Bloquea de forma segura llaves numéricas bajo la estrategia string
  mutacionesConCamel.create({
    // @ts-expect-error
    100: (state) => state,
    llaveValida: (state) => state,
  });
});

// ============================================================================
// 🔥 PROBANDO LOS CONSUMIDORES INDEPENDIENTES (Desacoplados del Core)
// ============================================================================

test("Mutaciones - Etapa 2: Transformación de Firmas Públicas Aislada", () => {
  function testRemocionState() {
    interface MutacionesPurasSimuladas {
      INCREMENTAR_EDAD: PureMutationFn<EstadoUsuario, unknown>;
      CAMBIAR_NOMBRE: PureMutationFn<EstadoUsuario, string>;
    }

    type AccionesPublicas = PublicActions<MutacionesPurasSimuladas>;

    interface AccionesEsperadas {
      INCREMENTAR_EDAD: () => void;
      CAMBIAR_NOMBRE: (nuevoNombre: string) => void;
    }

    // ✅ REQUISITO CUMPLIDO: Comprobamos que el tipo transformador independiente limpia las firmas perfectamente
    type TestFirmasLimpias = Expect<AccionesPublicas, AccionesEsperadas>;
  }
});

test("Mutaciones - Etapa 2: Ejecución del Reducer como Servicio Separado", () => {
  const storeMutations = defineMutations<EstadoUsuario>().create({
    INCREMENTAR_EDAD: (state) => ({ edad: state.edad + 1 }),
    CAMBIAR_NOMBRE: (state, nuevoNombre: string) => ({ nombre: nuevoNombre }),
  });

  // 🎯 Inicializamos el reducer pasándole las mutaciones puras de forma independiente
  const reducer = createReducer<EstadoUsuario, typeof storeMutations>(
    storeMutations,
  );

  const estadoInicial: EstadoUsuario = { nombre: "Alex", edad: 25 };

  // Ejecución limpia del reducer independiente en runtime
  const estado1 = reducer(estadoInicial, { type: "INCREMENTAR_EDAD" });
  assert.strictEqual(estado1.edad, 26);
  assert.strictEqual(estado1.nombre, "Alex");

  const estado2 = reducer(estado1, { type: "CAMBIAR_NOMBRE", payload: "Juan" });
  assert.strictEqual(estado2.nombre, "Juan");
  assert.strictEqual(estado2.edad, 26);
});
