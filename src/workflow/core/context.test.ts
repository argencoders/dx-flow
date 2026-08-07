import { test } from "node:test";
import { Expect } from "../../core/testing.types.js";
import {
  WorkflowContext,
  NavigationResult,
  createRuntimeContext,
} from "./context.js";
import assert from "node:assert";

interface EstadoSimulado {
  clicks: number;
  nombre: string;
}
type NodosSimulados = "start" | "pausa" | "fin";

test("Workflow - Context: Validación estática de firmas (.next y .mutate)", () => {
  function testDiseno() {
    const context = {} as WorkflowContext<EstadoSimulado, NodosSimulados>;

    // ✅ REQUISITO: Destino válido compila limpio
    const ok = context.next("pausa");
    type TestRetorno = Expect<typeof ok, NavigationResult>;

    // ❌ REQUISITO CUMPLIDO: Bloquea destinos inexistentes
    // @ts-expect-error
    context.next("NODO_FANTASMA");

    // ✅ REQUISITO: Acepta un patch parcial del estado
    context.mutate({ clicks: 5 });

    // ✅ REQUISITO: Acepta múltiples campos del estado en un solo patch
    context.mutate({ clicks: 1, nombre: "Maria" });

    // ❌ REQUISITO CUMPLIDO: Bloquea campos que no existen en TState
    // @ts-expect-error
    context.mutate({ campoInexistente: true });

    // ❌ REQUISITO CUMPLIDO: Bloquea tipos incorrectos para campos del estado
    // @ts-expect-error
    context.mutate({ clicks: "no_es_numero" });
  }
});

test("Workflow - Context: Ejecución en Runtime de createRuntimeContext", () => {
  let patchRecibido: Partial<EstadoSimulado> | null = null;

  const context = createRuntimeContext<EstadoSimulado, NodosSimulados>(
    (patch) => {
      patchRecibido = patch;
    },
  );

  // Ejecutamos la navegación física
  const nav = context.next("fin");
  assert.strictEqual(nav.target, "fin");

  // Ejecutamos la mutación física con un patch parcial
  context.mutate({ clicks: 100 });
  assert.deepStrictEqual(patchRecibido, { clicks: 100 });

  // Ejecutamos con múltiples campos
  context.mutate({ clicks: 0, nombre: "Juan" });
  assert.deepStrictEqual(patchRecibido, { clicks: 0, nombre: "Juan" });
});
