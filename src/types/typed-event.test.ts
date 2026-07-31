import { test } from "node:test";
import { ValidateHistoryArray } from "./typed-event.js";
import { DeepReadonly } from "./deep-readonly.js";

interface EstadoApp {
  saldo: number;
}

interface MutacionesSimuladas {
  DEPOSITAR: (
    state: DeepReadonly<EstadoApp>,
    payload: { monto: number },
  ) => Partial<EstadoApp>;
  NOTIFICAR: (
    state: DeepReadonly<EstadoApp>,
    payload?: { canal: string },
  ) => Partial<EstadoApp>;
  CERRAR_SESION: (state: DeepReadonly<EstadoApp>) => Partial<EstadoApp>;
}

/**
 * Tu aserción basada en la restricción nativa del genérico.
 * Obliga al array H a cumplir con la validación posicional estricta.
 */
type AssertValidHistory<
  H extends ValidateHistoryArray<MutacionesSimuladas, H>,
> = H;

test("Verificación estática de tipos para el Historial de Eventos (TypedEvent)", () => {
  function flujoPositivo() {
    // Casos Válidos: Compilan perfectamente sin errores
    type OK = AssertValidHistory<
      [
        { type: "DEPOSITAR"; payload: { monto: 100 } },
        { type: "NOTIFICAR"; payload: { canal: "EMAIL" } },
        { type: "NOTIFICAR"; payload: undefined },
        { type: "CERRAR_SESION"; payload: undefined },
      ]
    >;
  }

  function flujoNegativo() {
    type ErrIntrusoString = AssertValidHistory<
      // @ts-expect-error - ERROR TS: El tipo 'string' no es asignable al tipo 'number' de monto
      [{ type: "DEPOSITAR"; payload: { monto: "un string" } }]
    >;

    type ErrEventoInexistente = AssertValidHistory<
      // @ts-expect-error - ERROR TS: "RETIRAR_FONDOS" no existe en la unión discriminada de mutaciones
      [{ type: "RETIRAR_FONDOS"; payload: undefined }]
    >;

    type ErrPayloadInvalido = AssertValidHistory<
      // @ts-expect-error - ERROR TS: 'true' no es un número válido para el payload de DEPOSITAR
      [{ type: "DEPOSITAR"; payload: { monto: true } }]
    >;

    type ErrPayloadSobrante = AssertValidHistory<
      // @ts-expect-error - ERROR TS: No se permiten propiedades extras en CERRAR_SESION (espera undefined)
      [{ type: "CERRAR_SESION"; payload: { unDato: 123 } }]
    >;
  }
});
