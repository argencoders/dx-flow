import { test } from "node:test";
import { defineMutations } from "./framework-mutations.js";

interface EstadoEjemplo {
  usuarioId: string;
  saldo: number;
}

test("Verificación estática de tipos para FrameworkMutations Simplificado", () => {
  // Inicializamos el constructor del framework fijando nuestro estado de prueba
  const buildMutations = defineMutations<EstadoEjemplo>();

  function flujoPositivo() {
    // Caso Válido: Compila perfectamente.
    // Al pasar el cursor sobre 'state', verás que se autoinfiere como DeepReadonly<EstadoEjemplo>.
    const OK = buildMutations({
      COBRO_FALLIDO: (state, payload: { error: string }) => ({
        saldo: state.saldo - 10,
      }),
    });
  }

  function flujoNegativo() {
    const errRetorno = buildMutations({
      // @ts-expect-error - ERROR: El retorno contiene una propiedad 'hack' que no existe en EstadoEjemplo
      COBRO_EXITOSO: (state) => ({
        hack: true,
      }),

      // @ts-expect-error - ERROR: La clave debe estar estrictamente en MAYÚSCULAS
      cobro_invalido: (state) => ({
        saldo: 0,
      }),
    });
  }
});
