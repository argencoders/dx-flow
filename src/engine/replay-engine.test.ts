import { test } from "node:test";
import { executeReplay } from "./replay-engine.js";
import { defineMutations } from "../types/framework-mutations.js";

interface EstadoBalance {
  saldo: number;
}

const estadoInicial: EstadoBalance = { saldo: 100 };

const mutacionesBalance = defineMutations<EstadoBalance>()({
  DEPOSITAR: (state, payload: { monto: number }) => ({
    saldo: state.saldo + payload.monto,
  }),
  REINICIAR: () => ({
    saldo: 0,
  }),
});

test("Verificación estática y de ejecución para executeReplay", () => {
  function flujoPositivo() {
    // Caso Válido: Compila perfectamente y la inferencia de tipos fluye sola de derecha a izquierda
    const estadoFinal = executeReplay(
      [
        { type: "DEPOSITAR", payload: { monto: 50 } },
        { type: "REINICIAR", payload: undefined },
      ],
      mutacionesBalance,
      estadoInicial,
    );
  }

  function flujoNegativo() {
    executeReplay(
      // @ts-expect-error - ERROR: "RETIRAR" no existe en las mutaciones declaradas
      [{ type: "RETIRAR", payload: { monto: 10 } }],
      mutacionesBalance,
      estadoInicial,
    );

    executeReplay(
      // @ts-expect-error - ERROR: El payload de DEPOSITAR requiere un número, no un string
      [{ type: "DEPOSITAR", payload: { monto: "error" } }],
      mutacionesBalance,
      estadoInicial,
    );
  }
});
