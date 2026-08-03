import { test } from "node:test";
import { Expect } from "../../core/types-testing.js";
import {
  WorkflowContext,
  NavigationResult,
  createRuntimeContext,
} from "./context.js";
import assert from "node:assert";

interface EstadoSimulado {
  clicks: number;
}
type NodosSimulados = "start" | "pausa" | "fin";

interface MutacionesSimuladas {
  INCREMENTAR: (state: EstadoSimulado, payload: unknown) => any;
  SET_VALOR: (state: EstadoSimulado, v: number) => any;
}

test("Workflow - Context: Validación estática de firmas (.next y .mutate)", () => {
  function testDiseno() {
    const context = {} as WorkflowContext<
      EstadoSimulado,
      NodosSimulados,
      MutacionesSimuladas
    >;

    // ✅ REQUISITO: Destino válido compila limpio
    const ok = context.next("pausa");
    type TestRetorno = Expect<typeof ok, NavigationResult>;

    // ❌ REQUISITO CUMPLIDO: Bloquea destinos inexistentes
    // @ts-expect-error
    context.next("NODO_FANTASMA");

    // ✅ REQUISITO: Permite mutaciones sin payload
    context.mutate("INCREMENTAR");

    // ✅ REQUISITO: Exige el tipo de payload correcto si está declarado
    context.mutate("SET_VALOR", 42);

    // ❌ REQUISITO CUMPLIDO: Bloquea payloads de tipos erróneos
    // @ts-expect-error
    context.mutate("SET_VALOR", "un_string_ilegal");
  }
});

test("Workflow - Context: Ejecución en Runtime de createRuntimeContext", () => {
  let mutacionGatillada: any = null;
  let payloadGatillado: any = null;

  // Inicializamos el contexto real usando el constructor corregido
  const context = createRuntimeContext<
    EstadoSimulado,
    NodosSimulados,
    MutacionesSimuladas
  >((key, pl) => {
    mutacionGatillada = key;
    payloadGatillado = pl;
  });

  // Ejecutamos la navegación física
  const nav = context.next("fin");
  assert.strictEqual(nav.target, "fin");

  // Ejecutamos la mutación física
  context.mutate("SET_VALOR", 100);
  assert.strictEqual(mutacionGatillada, "SET_VALOR");
  assert.strictEqual(payloadGatillado, 100);
});
