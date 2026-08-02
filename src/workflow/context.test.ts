import { test } from "node:test";
import { Expect } from "../core/types-testing.js";
import { WorkflowContext, NavigationResult } from "./context.js";

test("Workflow - Context: Validación atómica de seguridad de destinos (.next)", () => {
  // 1. Simulamos una lista blanca de nodos existentes de un grafo de cobro
  type MisNodos = "start" | "intentar_pago" | "activar_suscripcion";
  interface MiEstado {
    clicks: number;
  }

  function testFlujosDeNavegacion() {
    // Declaramos un contexto simulado alimentado por nuestra lista blanca de nodos
    const context = {} as WorkflowContext<MiEstado, MisNodos>;

    // ✅ REQUISITO: Pasar un destino que existe en la lista blanca debe compilar de forma limpia
    const transicionValida = context.next("intentar_pago");
    type TestRetorno = Expect<typeof transicionValida, NavigationResult>;

    // ❌ REQUISITO CUMPLIDO: Intentar saltar a un nodo fantasma debe ser bloqueado por el compilador en el acto
    // @ts-expect-error
    context.next("NODO_FANTASMA_QUE_NO_EXISTE");

    // ❌ REQUISITO CUMPLIDO: Tampoco debe aceptar un string general vacío o genérico
    // @ts-expect-error
    context.next("");
  }
});
