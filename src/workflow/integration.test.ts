import { test } from "node:test";
import assert from "node:assert/strict";
import { executeWorkflow, resumeWorkflow } from "./core/engine.js";
import { defineWorkflow, WorkflowGraph } from "./core/factory.js";

/**
 * 1. Tipos de Dominio del Negocio (E-Commerce Order Fulfillment)
 */
interface EstadoPedido {
  idPedido: string;
  monto: number;
  descuentoAplicado: number;
  esVip: boolean;
  estadoPedido:
    | "NUEVO"
    | "PENDIENTE_PAGO"
    | "PAGADO"
    | "DESPACHADO"
    | "CANCELADO"
    | "RECHAZADO";
  transaccionPagoId?: string;
  razonCancelacion?: string;
}

interface ServiciosPedido {
  verificarStock: (idPedido: string) => boolean;
  registrarTransaccion: (idPedido: string, txId: string, monto: number) => void;
  notificarCliente: (mensaje: string) => void;
  despacharLogistica: (idPedido: string) => void;
}

/**
 * Eventos Externos / Señales esperadas por el Workflow
 */
interface EventosPedido {
  WEBHOOK_PAGO_RECIBIDO: {
    txId: string;
    exitoso: boolean;
    razonFallo?: string;
  };
}

/**
 * 2. Definición del Workflow Builder con Tipado Estricto de TEvents
 */
const wf = defineWorkflow<EstadoPedido, ServiciosPedido, EventosPedido>();

type NodosPedidoList =
  | "start"
  | "evaluar_descuento_vip"
  | "aplicar_descuento"
  | "procesar_pago"
  | "delay_preparacion_logistica"
  | "despachar_pedido"
  | "fin_exito"
  | "fin_cancelado"
  | "fin_pago_fallido";

/**
 * 3. Factoría del Grafo del Workflow Multinodo (Plan B: Suspensión Dinámica con ctx.suspend)
 */
function crearGrafoPedido(): WorkflowGraph<
  EstadoPedido,
  ServiciosPedido,
  NodosPedidoList,
  EventosPedido
> {
  return wf.create({
    id: "fulfillment_pedidos_v1",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {
          const tieneStock = ctx.services.verificarStock(state.idPedido);
          if (!tieneStock) {
            ctx.mutate({ estadoPedido: "CANCELADO", razonCancelacion: "SIN_STOCK" });
            return "ERROR_SIN_STOCK";
          }
          ctx.mutate({ monto: state.monto, estadoPedido: "PENDIENTE_PAGO" });
        },
        onSuccess: "evaluar_descuento_vip",
        onError: {
          ERROR_SIN_STOCK: "fin_cancelado",
        },
      },
      evaluar_descuento_vip: {
        type: "choose",
        choices: [
          {
            condition: (state) => state.esVip,
            nextNode: "aplicar_descuento",
          },
        ],
        otherwise: "procesar_pago",
      },
      aplicar_descuento: {
        type: "action",
        action: (state, ctx) => {
          const descuento = (state.monto * 10) / 100;
          ctx.mutate({ descuentoAplicado: descuento, monto: state.monto - descuento });
        },
        onSuccess: "procesar_pago",
      },
      procesar_pago: {
        type: "action",
        action: (state, ctx) => {
          // ⏸️ Si aún no llega la señal externa, nos suspendemos dinámicamente
          if (!ctx.signalPayload) {
            return ctx.suspend("WEBHOOK_PAGO_RECIBIDO");
          }

          // ⚡ Al reanudar, ctx.signalPayload está 100% tipado por TEvents (Cero casteos!)
          const { txId, exitoso, razonFallo } = ctx.signalPayload;

          if (!exitoso) {
            const razon = razonFallo ?? "PAGO_RECHAZADO_POR_BANCO";
            ctx.mutate({ estadoPedido: "RECHAZADO", razonCancelacion: razon });
            ctx.services.notificarCliente(
              `El pago del pedido ${state.idPedido} fue rechazado. Razon: ${razon}`,
            );
            return "ERROR_PAGO_RECHAZADO";
          }

          ctx.mutate({ transaccionPagoId: txId, estadoPedido: "PAGADO" });
          ctx.services.registrarTransaccion(state.idPedido, txId, state.monto);
        },
        onSuccess: "delay_preparacion_logistica",
        onError: {
          ERROR_PAGO_RECHAZADO: "fin_pago_fallido",
        },
      },
      delay_preparacion_logistica: {
        type: "delay",
        durationMs: 3000,
        onTimeout: "despachar_pedido",
      },
      despachar_pedido: {
        type: "action",
        action: (state, ctx) => {
          ctx.services.despacharLogistica(state.idPedido);
          ctx.mutate({ estadoPedido: "DESPACHADO" });
          ctx.services.notificarCliente(
            `Pedido ${state.idPedido} despachado exitosamente.`,
          );
        },
        onSuccess: "fin_exito",
      },
      fin_exito: {
        type: "end",
        status: "ORDEN_ENTREGADA",
      },
      fin_cancelado: {
        type: "end",
        status: "ORDEN_CANCELADA_SIN_STOCK",
      },
      fin_pago_fallido: {
        type: "end",
        status: "ORDEN_RECHAZADA_PAGO_FALLIDO",
      },
    },
  });
}

/**
 * 4. Suite de Pruebas de Integración End-to-End
 */
test("Integration E2E: Flujo Feliz Completo Cliente VIP (Plan B: Suspensión Dinámica ctx.suspend, Delay y Reanudación)", async () => {
  const graph = crearGrafoPedido();

  const transaccionesRegistradas: Array<{ id: string; txId: string; monto: number }> = [];
  const notificaciones: string[] = [];
  const despachos: string[] = [];
  let msDelayLogistica = 0;
  const patchesAplicados: Array<Partial<EstadoPedido>> = [];

  const servicios: ServiciosPedido = {
    verificarStock: () => true,
    registrarTransaccion: (id, txId, monto) => {
      transaccionesRegistradas.push({ id, txId, monto });
    },
    notificarCliente: (msg) => {
      notificaciones.push(msg);
    },
    despacharLogistica: (id) => {
      despachos.push(id);
    },
  };

  const estadoInicial: EstadoPedido = {
    idPedido: "PED-VIP-99",
    monto: 500,
    descuentoAplicado: 0,
    esVip: true,
    estadoPedido: "NUEVO",
  };

  // FASE 1: Ejecución Inicial hasta Suspensión Dinámica en procesar_pago
  const resInicial = await executeWorkflow({
    graph,
    initialState: estadoInicial,
    services: servicios,
    onMutation: (patch) => {
      patchesAplicados.push(patch);
    },
    delayFn: async (ms) => {
      msDelayLogistica = ms;
    },
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.suspendedAtNodeId, "procesar_pago");
    assert.equal(resInicial.eventName, "WEBHOOK_PAGO_RECIBIDO");
    // Descuento del 10% de 500 = 50 -> Monto final 450
    assert.equal(resInicial.finalState.monto, 450);
    assert.equal(resInicial.finalState.descuentoAplicado, 50);
    assert.equal(resInicial.finalState.estadoPedido, "PENDIENTE_PAGO");
    assert.equal(resInicial.history.length, 4);
    assert.equal(resInicial.history[0].nodeId, "start");
    assert.equal(resInicial.history[1].nodeId, "evaluar_descuento_vip");
    assert.equal(resInicial.history[2].nodeId, "aplicar_descuento");
    assert.equal(resInicial.history[3].nodeId, "procesar_pago");
  }

  // Verificamos que se aplicaron 2 patches (start + aplicar_descuento)
  assert.equal(patchesAplicados.length, 2);

  // FASE 2: Reanudación tras recibir Webhook de Pago Exitoso con signalPayload
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      onMutation: (patch) => {
        patchesAplicados.push(patch);
      },
      delayFn: async (ms) => {
        msDelayLogistica = ms;
      },
      signalPayload: {
        txId: "TX-PASARELA-777",
        exitoso: true,
      },
    });

    assert.equal(resFinal.status, "COMPLETED");
    if (resFinal.status === "COMPLETED") {
      assert.equal(resFinal.endStatus, "ORDEN_ENTREGADA");
      assert.equal(resFinal.finalState.estadoPedido, "DESPACHADO");
      assert.equal(resFinal.finalState.transaccionPagoId, "TX-PASARELA-777");
      assert.equal(resFinal.finalState.monto, 450);
      assert.equal(resFinal.history.length, 4); // Pasos ejecutados tras la reanudación
      assert.equal(resFinal.history[0].nodeId, "procesar_pago");
      assert.equal(resFinal.history[1].nodeId, "delay_preparacion_logistica");
      assert.equal(resFinal.history[2].nodeId, "despachar_pedido");
      assert.equal(resFinal.history[3].nodeId, "fin_exito");
    }

    assert.equal(msDelayLogistica, 3000);
    assert.equal(transaccionesRegistradas.length, 1);
    assert.deepEqual(transaccionesRegistradas[0], {
      id: "PED-VIP-99",
      txId: "TX-PASARELA-777",
      monto: 450,
    });
    assert.equal(despachos.length, 1);
    assert.equal(despachos[0], "PED-VIP-99");
    assert.equal(notificaciones.length, 1);
    assert.equal(
      notificaciones[0],
      "Pedido PED-VIP-99 despachado exitosamente.",
    );

    // 4 patches en total: start, aplicar_descuento, procesar_pago, despachar_pedido
    assert.equal(patchesAplicados.length, 4);
  }
});

test("Integration E2E: Flujo Feliz Cliente Estándar (Sin Descuento VIP)", async () => {
  const graph = crearGrafoPedido();

  const servicios: ServiciosPedido = {
    verificarStock: () => true,
    registrarTransaccion: () => {},
    notificarCliente: () => {},
    despacharLogistica: () => {},
  };

  const estadoInicial: EstadoPedido = {
    idPedido: "PED-STD-50",
    monto: 200,
    descuentoAplicado: 0,
    esVip: false,
    estadoPedido: "NUEVO",
  };

  // 1. Ejecución Inicial -> Pasa por 'choose' y salta 'aplicar_descuento' directo a 'procesar_pago'
  const resInicial = await executeWorkflow({
    graph,
    initialState: estadoInicial,
    services: servicios,
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.suspendedAtNodeId, "procesar_pago");
    assert.equal(resInicial.finalState.monto, 200); // Sin descuento
    assert.equal(resInicial.finalState.descuentoAplicado, 0);
    assert.equal(resInicial.history.length, 3);
    assert.equal(resInicial.history[0].nodeId, "start");
    assert.equal(resInicial.history[1].nodeId, "evaluar_descuento_vip");
    assert.equal(resInicial.history[2].nodeId, "procesar_pago");
  }

  // 2. Reanudación exitosa
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      delayFn: async () => {},
      signalPayload: {
        txId: "TX-STD-123",
        exitoso: true,
      },
    });

    assert.equal(resFinal.status, "COMPLETED");
    if (resFinal.status === "COMPLETED") {
      assert.equal(resFinal.endStatus, "ORDEN_ENTREGADA");
      assert.equal(resFinal.finalState.estadoPedido, "DESPACHADO");
      assert.equal(resFinal.finalState.monto, 200);
    }
  }
});

test("Integration E2E: Flujo de Cancelación Temprana por Error Mapeado (Sin Stock)", async () => {
  const graph = crearGrafoPedido();

  const servicios: ServiciosPedido = {
    verificarStock: () => false, // ❌ Simula falta de stock
    registrarTransaccion: () => {},
    notificarCliente: () => {},
    despacharLogistica: () => {},
  };

  const res = await executeWorkflow({
    graph,
    initialState: {
      idPedido: "PED-NO-STOCK",
      monto: 100,
      descuentoAplicado: 0,
      esVip: false,
      estadoPedido: "NUEVO",
    },
    services: servicios,
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "ORDEN_CANCELADA_SIN_STOCK");
    assert.equal(res.finalState.estadoPedido, "CANCELADO");
    assert.equal(res.finalState.razonCancelacion, "SIN_STOCK");
    assert.equal(res.history.length, 2);
    assert.equal(res.history[0].nodeId, "start");
    assert.equal(res.history[1].nodeId, "fin_cancelado");
  }
});

test("Integration E2E: Flujo de Fallo en Reanudación (Webhook con Pago Rechazado)", async () => {
  const graph = crearGrafoPedido();
  const notificaciones: string[] = [];

  const servicios: ServiciosPedido = {
    verificarStock: () => true,
    registrarTransaccion: () => {},
    notificarCliente: (msg) => {
      notificaciones.push(msg);
    },
    despacharLogistica: () => {},
  };

  // 1. Ejecución Inicial hasta Suspensión en procesar_pago
  const resInicial = await executeWorkflow({
    graph,
    initialState: {
      idPedido: "PED-FAIL-PAYMENT",
      monto: 350,
      descuentoAplicado: 0,
      esVip: false,
      estadoPedido: "NUEVO",
    },
    services: servicios,
  });

  assert.equal(resInicial.status, "SUSPENDED");

  // 2. Reanudación con Payload de Pago Fallido/Rechazado
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      signalPayload: {
        txId: "TX-REJECTED",
        exitoso: false,
        razonFallo: "FONDOS_INSUFICIENTES",
      },
    });

    assert.equal(resFinal.status, "COMPLETED");
    if (resFinal.status === "COMPLETED") {
      assert.equal(resFinal.endStatus, "ORDEN_RECHAZADA_PAGO_FALLIDO");
      assert.equal(resFinal.finalState.estadoPedido, "RECHAZADO");
      assert.equal(
        resFinal.finalState.razonCancelacion,
        "FONDOS_INSUFICIENTES",
      );
      assert.equal(resFinal.history.length, 2);
      assert.equal(resFinal.history[0].nodeId, "procesar_pago");
      assert.equal(resFinal.history[1].nodeId, "fin_pago_fallido");
    }

    assert.equal(notificaciones.length, 1);
    assert.equal(
      notificaciones[0],
      "El pago del pedido PED-FAIL-PAYMENT fue rechazado. Razon: FONDOS_INSUFICIENTES",
    );
  }
});

test("Integration E2E - Fase 5: Flujo Compuesto con sequence, repeat y parallel", async () => {
  interface EstadoCompuesto {
    contador: number;
    procesado: boolean;
  }

  const wfCompuesto = defineWorkflow<EstadoCompuesto, Record<string, never>>();

  const graph = wfCompuesto.create({
    id: "flujo_compuesto_e2e",
    nodes: {
      start: {
        type: "sequence",
        steps: [
          (state, ctx) => {
            ctx.mutate({ contador: state.contador + 1 });
          },
          (state, ctx) => {
            ctx.mutate({ contador: state.contador + 1 });
          },
        ],
        onSuccess: "bucle_iterativo",
      },
      bucle_iterativo: {
        type: "repeat",
        target: "start",
        until: (state) => state.contador >= 5,
        onSuccess: "seccion_paralela",
      },
      seccion_paralela: {
        type: "parallel",
        branches: ["rama_final"],
        onSuccess: "fin_exito",
      },
      rama_final: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate({ procesado: true });
        },
        onSuccess: "fin_exito",
      },
      fin_exito: {
        type: "end",
        status: "COMPUESTO_OK",
      },
    },
  });

  const res = await executeWorkflow({
    graph,
    initialState: { contador: 0, procesado: false },
    services: {},
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "COMPUESTO_OK");
    assert.equal(res.finalState.contador, 6);
    assert.equal(res.finalState.procesado, true);
  }
});

test("Integration E2E - Fase 5.2: Flujo Compuesto con repeat conteniendo steps inline puros", async () => {
  interface EstadoInlineRepeat {
    acumulado: number;
    ciclos: number;
  }

  const wfInline = defineWorkflow<EstadoInlineRepeat, Record<string, never>>();

  const graph = wfInline.create({
    id: "flujo_repeat_inline_e2e",
    nodes: {
      start: {
        type: "repeat",
        steps: [
          (state, ctx) => {
            ctx.mutate({ acumulado: state.acumulado + 10 });
          },
          {
            type: "delay",
            durationMs: 50,
          },
          (state, ctx) => {
            ctx.mutate({ ciclos: state.ciclos + 1 });
          },
        ],
        until: (state) => state.ciclos >= 3,
        count: 5,
        onSuccess: "fin_exito",
      },
      fin_exito: {
        type: "end",
        status: "REPEAT_INLINE_OK",
      },
    },
  });

  const res = await executeWorkflow({
    graph,
    initialState: { acumulado: 0, ciclos: 0 },
    services: {},
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "REPEAT_INLINE_OK");
    assert.equal(res.finalState.ciclos, 3);
    assert.equal(res.finalState.acumulado, 30);
  }
});

test("Integration E2E - Fase 5: Suspensión y Reanudación Durable dentro de un paso inline en repeat", async () => {
  interface EstadoSuspensionRepeat {
    intentos: number;
    aprobado: boolean;
  }

  interface EventosSuspension {
    APROBACION_HUMANA: {
      aprobado: boolean;
    };
  }

  const wfSuspend = defineWorkflow<
    EstadoSuspensionRepeat,
    Record<string, never>,
    EventosSuspension
  >();

  const graph = wfSuspend.create({
    id: "flujo_repeat_inline_suspend",
    nodes: {
      start: {
        type: "repeat",
        steps: [
          // Paso 1: Incrementar contador de intentos
          (state, ctx) => {
            ctx.mutate({ intentos: state.intentos + 1 });
          },
          // Paso 2: Acción inline que solicita aprobación y se suspende dinámicamente
          {
            type: "action",
            action: (state, ctx) => {
              if (!ctx.signalPayload) {
                return ctx.suspend("APROBACION_HUMANA");
              }
              const { aprobado } = ctx.signalPayload;
              if (aprobado) {
                ctx.mutate({ aprobado: true });
              }
            },
          },
        ],
        until: (state) => state.aprobado || state.intentos >= 3,
        onSuccess: "fin",
      },
      fin: {
        type: "end",
        status: "FIN_SUSPENSION_OK",
      },
    },
  });

  // 1. Ejecución inicial: Ejecuta paso 1 (intentos: 1) y suspende en paso 2 esperando APROBACION_HUMANA
  const resInicial = await executeWorkflow({
    graph,
    initialState: { intentos: 0, aprobado: false },
    services: {},
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.eventName, "APROBACION_HUMANA");
    assert.equal(resInicial.finalState.intentos, 1);
    assert.equal(resInicial.finalState.aprobado, false);
  }

  // 2. Reanudación con aprobación concedida: completa el paso 2, mutate aprobado: true, until evalúa true y finaliza
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: {},
      signalPayload: { aprobado: true },
    });

    assert.equal(resFinal.status, "COMPLETED");
    if (resFinal.status === "COMPLETED") {
      assert.equal(resFinal.endStatus, "FIN_SUSPENSION_OK");
      assert.equal(resFinal.finalState.intentos, 2);
      assert.equal(resFinal.finalState.aprobado, true);
    }
  }
});

test("Integration E2E - Fase 5.3: Flujo Compuesto con parallel conteniendo branches inline puros", async () => {
  interface EstadoParallelInline {
    notificacionEnviada: boolean;
    auditoriaRegistrada: boolean;
  }

  const wfParallelInline = defineWorkflow<
    EstadoParallelInline,
    Record<string, never>
  >();

  const graph = wfParallelInline.create({
    id: "flujo_parallel_inline_e2e",
    nodes: {
      start: {
        type: "parallel",
        branches: [
          // Rama 1: Shorthand callback
          (_state, ctx) => {
            ctx.mutate({ notificacionEnviada: true });
          },
          // Rama 2: Acción inline con mutación
          {
            type: "action",
            action: (_state, ctx) => {
              ctx.mutate({ auditoriaRegistrada: true });
            },
          },
        ],
        onSuccess: "fin_exito",
      },
      fin_exito: {
        type: "end",
        status: "PARALLEL_INLINE_OK",
      },
    },
  });

  const res = await executeWorkflow({
    graph,
    initialState: { notificacionEnviada: false, auditoriaRegistrada: false },
    services: {},
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "PARALLEL_INLINE_OK");
    assert.equal(res.finalState.notificacionEnviada, true);
    assert.equal(res.finalState.auditoriaRegistrada, true);
  }
});

test("Integration E2E - Fase 5.4: Flujo con Reintentos Automáticos (RetryPolicy y Backoff Exponencial)", async () => {
  interface EstadoRetryE2E {
    intentosNodo: number;
    intentosPasoInline: number;
    resultadoFinal: string;
  }

  const wfRetry = defineWorkflow<EstadoRetryE2E, Record<string, never>>();

  const graph = wfRetry.create({
    id: "flujo_retry_e2e",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate({ intentosNodo: state.intentosNodo + 1 });
          if (state.intentosNodo + 1 < 3) {
            throw new Error("FALLO_TRANSITORIO_RED");
          }
        },
        retry: {
          maxAttempts: 3,
          initialIntervalMs: 100,
          backoffCoefficient: 2,
        },
        onSuccess: "paso_inline_retry",
      },
      paso_inline_retry: {
        type: "sequence",
        steps: [
          {
            type: "action",
            action: (state, ctx) => {
              ctx.mutate({ intentosPasoInline: state.intentosPasoInline + 1 });
              if (state.intentosPasoInline + 1 < 2) {
                return "ERROR_TEMPORAL_INLINE";
              }
              ctx.mutate({ resultadoFinal: "EXITO" });
            },
            retry: {
              maxAttempts: 2,
              initialIntervalMs: 50,
              retryableErrors: ["ERROR_TEMPORAL_INLINE"],
            },
          },
        ],
        onSuccess: "fin_exito",
      },
      fin_exito: {
        type: "end",
        status: "RETRY_E2E_OK",
      },
    },
  });

  const delaysRegistrados: number[] = [];

  const res = await executeWorkflow({
    graph,
    initialState: {
      intentosNodo: 0,
      intentosPasoInline: 0,
      resultadoFinal: "PENDIENTE",
    },
    services: {},
    delayFn: async (ms) => {
      delaysRegistrados.push(ms);
    },
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "RETRY_E2E_OK");
    assert.equal(res.finalState.intentosNodo, 3);
    assert.equal(res.finalState.intentosPasoInline, 2);
    assert.equal(res.finalState.resultadoFinal, "EXITO");
    // Delays acumulados: 100ms, 200ms para el nodo action + 50ms para el paso inline
    assert.deepStrictEqual(delaysRegistrados, [100, 200, 50]);
  }
});

test("Integration E2E - Fase 5.4: Fallo de Reintentos tras Agotar maxAttempts (Navegación a onError)", async () => {
  interface EstadoExhaustion {
    intentos: number;
  }

  const wfExhaust = defineWorkflow<EstadoExhaustion, Record<string, never>>();

  const graph = wfExhaust.create({
    id: "flujo_retry_exhaustion_e2e",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx): "ERROR_PERSISTENTE" => {
          ctx.mutate({ intentos: state.intentos + 1 });
          return "ERROR_PERSISTENTE";
        },
        retry: {
          maxAttempts: 2,
          initialIntervalMs: 50,
          retryableErrors: ["ERROR_PERSISTENTE"],
        },
        onSuccess: "fin_exito",
        onError: {
          ERROR_PERSISTENTE: "fin_error",
        },
      },
      fin_exito: { type: "end", status: "OK" },
      fin_error: { type: "end", status: "RETRY_EXHAUSTED" },
    },
  });

  const delays: number[] = [];

  const res = await executeWorkflow({
    graph,
    initialState: { intentos: 0 },
    services: {},
    delayFn: async (ms) => {
      delays.push(ms);
    },
  });

  assert.equal(res.status, "COMPLETED");
  if (res.status === "COMPLETED") {
    assert.equal(res.endStatus, "RETRY_EXHAUSTED");
    assert.equal(res.finalState.intentos, 2);
    assert.deepStrictEqual(delays, [50]);
  }
});

test("Integration E2E - Fase 5.5: Patrón Saga y Rollback Automático de Compensaciones en Orden Inverso (LIFO)", async () => {
  interface EstadoSagaViaje {
    vueloReservado: boolean;
    hotelReservado: boolean;
    cobroExitoso: boolean;
    ordenCompensaciones: string[];
  }

  const wfSaga = defineWorkflow<EstadoSagaViaje, Record<string, never>>();

  const graph = wfSaga.create({
    id: "saga_reserva_viaje_e2e",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate({ vueloReservado: true });
        },
        compensate: (state, ctx) => {
          ctx.mutate({
            vueloReservado: false,
            ordenCompensaciones: [...state.ordenCompensaciones, "CANCELAR_VUELO"],
          });
        },
        onSuccess: "secuencia_hotel",
      },
      secuencia_hotel: {
        type: "sequence",
        steps: [
          {
            type: "action",
            action: (state, ctx) => {
              ctx.mutate({ hotelReservado: true });
            },
            compensate: (state, ctx) => {
              ctx.mutate({
                hotelReservado: false,
                ordenCompensaciones: [...state.ordenCompensaciones, "CANCELAR_HOTEL"],
              });
            },
          },
        ],
        onSuccess: "procesar_pago_saga",
      },
      procesar_pago_saga: {
        type: "action",
        action: () => {
          // ❌ Simula un error no recuperable en el servicio de pago
          throw new Error("ERROR_PASARELA_SAGA_FATAL");
        },
        onSuccess: "fin_exito",
      },
      fin_exito: { type: "end", status: "SAGA_OK" },
    },
  });

  const estadoInicial: EstadoSagaViaje = {
    vueloReservado: false,
    hotelReservado: false,
    cobroExitoso: false,
    ordenCompensaciones: [],
  };

  const ordenCompensacionesAuditoria: string[] = [];

  // Al lanzar la ejecución, la excepción no capturada en procesar_pago_saga dispara el rollback de las compensaciones
  await assert.rejects(
    async () => {
      await executeWorkflow({
        graph,
        initialState: estadoInicial,
        services: {},
        onMutation: (_patch, newState) => {
          if (newState.ordenCompensaciones.length > ordenCompensacionesAuditoria.length) {
            const ultimoItem = newState.ordenCompensaciones[newState.ordenCompensaciones.length - 1];
            ordenCompensacionesAuditoria.push(ultimoItem);
          }
        },
      });
    },
    {
      message: "ERROR_PASARELA_SAGA_FATAL",
    },
  );

  // Verificamos que las compensaciones se ejecutaron en orden LIFO inverso: HOTEL primero, VUELO después
  assert.deepStrictEqual(ordenCompensacionesAuditoria, [
    "CANCELAR_HOTEL",
    "CANCELAR_VUELO",
  ]);
});
