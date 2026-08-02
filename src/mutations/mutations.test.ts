import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { defineMutations } from "./mutations.js";
import { DeepReadonly } from "../core/deep-readonly.js";

interface EstadoUsuario {
  nombre: string;
  edad: number;
}

test("Mutaciones - Etapa 1: Inferencia, inmutabilidad y Casing por defecto (SCREAMING_SNAKE)", () => {
  // Inicializamos usando la configuración por defecto
  const mutaciones = defineMutations<EstadoUsuario>();

  const acciones = mutaciones.create({
    INCREMENTAR_EDAD: (state) => {
      // @ts-expect-error - ERROR: state es inmutable
      state.edad = state.edad + 1;
      return { edad: state.edad + 1 };
    },

    CAMBIAR_NOMBRE: (state, nuevoNombre: string) => ({ nombre: nuevoNombre }),
  });

  function testFirmasResultantes() {
    type FirmaIncrementar = typeof acciones.INCREMENTAR_EDAD;
    type Ok = Expect<
      FirmaIncrementar,
      (
        state: DeepReadonly<EstadoUsuario>,
        payload: unknown,
      ) => EstadoUsuario | Partial<EstadoUsuario>
    >;
  }

  // ❌ REQUISITO: Por defecto debe seguir bloqueando llaves en minúscula de forma localizada
  mutaciones.create({
    // @ts-expect-error
    cambiar_edad: (state) => state,
    OK: (state) => state,
  });
});

test("Mutaciones - Etapa 1: Cambio interactivo de Estrategia de Casing (string)", () => {
  // 🎯 Inyectamos la estrategia "string" como segundo parámetro genérico
  const mutacionesConCamel = defineMutations<EstadoUsuario, "string">();

  const acciones = mutacionesConCamel.create({
    // ✅ REQUISITO: Ahora las llaves en minúscula/camelCase son totalmente permitidas por la estrategia string
    cambiarEdad: (state) => ({ edad: state.edad + 1 }),
    nombreModificado: (state, n: string) => ({ nombre: n }),
  });

  // ❌ REQUISITO: Debe rechazar si el desarrollador mete una llave numérica bajo la estrategia string
  mutacionesConCamel.create({
    // @ts-expect-error
    100: (state) => state,
    llaveValida: (state) => state,
  });
});
