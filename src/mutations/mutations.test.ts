import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { defineMutations } from "./mutations.js";
import { DeepReadonly } from "../core/deep-readonly.js";

interface EstadoUsuario {
  nombre: string;
  edad: number;
}

const mutaciones = defineMutations<EstadoUsuario>();

test("Mutaciones - Etapa 1: Inferencia, inmutabilidad y retorno Partial", () => {
  const acciones = mutaciones.create({
    // ✅ REQUISITO: Ahora se permite retornar un Partial simplificado (sólo la edad)
    INCREMENTAR_EDAD: (state) => {
      // @ts-expect-error - ERROR: state sigue siendo inmutable (DeepReadonly)
      state.edad = state.edad + 1;
      return { edad: state.edad + 1 };
    },

    // ✅ REQUISITO: Sigue permitiendo retornar el estado completo de forma opcional
    CAMBIAR_NOMBRE: (state, nuevoNombre: string) => {
      return {
        nombre: nuevoNombre,
        edad: state.edad,
      };
    },
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
});

test("Mutaciones - Etapa 1: Aislamiento del error por Nomenclatura (Casing)", () => {
  mutaciones.create({
    // 🎯 COMPROBACIÓN REQUERIDA (Verifica en tu editor):
    // La línea roja ahora se dibujará de forma precisa y localizada únicamente debajo de 'cambiar_edad'.
    // La clave 'OK' de abajo compilará de forma completamente limpia y silenciosa sin recibir salpicaduras de error.
    // @ts-expect-error
    cambiar_edad: (state) => state,

    OK: (state) => state,
  });
});
