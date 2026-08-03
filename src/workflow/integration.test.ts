import { test } from "node:test";
import assert from "node:assert/strict";
import { executeWorkflow, resumeWorkflow } from "./engine.js";
import { defineWorkflow, WorkflowGraph } from "./factory.js";
import { defineMutations } from "../mutations/mutations.js";

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

interface MutacionesPedido {
  MARCAR_PENDIENTE_PAGO: (
    state: EstadoPedido,
    payload: { monto: number },
  ) => Partial<EstadoPedido>;
  APLICAR_DESCUENTO: (
    state: EstadoPedido,
    payload: { porcentaje: number },
  ) => Partial<EstadoPedido>;
  REGISTRAR_PAGO: (
    state: EstadoPedido,
    payload: { txId: string },
  ) => Partial<EstadoPedido>;
  COMPLETAR_DESPACHO: (state: EstadoPedido) => Partial<EstadoPedido>;
  MARCAR_CANCELADO: (
    state: EstadoPedido,
    payload: { razon: string; esRechazo?: boolean },
  ) => Partial<EstadoPedido>;
}

/**
 * 2. Registro de Mutaciones Typed del Negocio
 */
const mutacionesPedido = defineMutations<EstadoPedido>().create({
  MARCAR_PENDIENTE_PAGO: (state, payload: { monto: number }) => ({
    monto: payload.monto,
    estadoPedido: "PENDIENTE_PAGO",
  }),
  APLICAR_DESCUENTO: (state, payload: { porcentaje: number }) => {
    const descuento = (state.monto * payload.porcentaje) / 100;
    return {
      descuentoAplicado: descuento,
      monto: state.monto - descuento,
    };
  },
  REGISTRAR_PAGO: (state, payload: { txId: string }) => ({
    transaccionPagoId: payload.txId,
    estadoPedido: "PAGADO",
  }),
  COMPLETAR_DESPACHO: () => ({
    estadoPedido: "DESPACHADO",
  }),
  MARCAR_CANCELADO: (
    state,
    payload: { razon: string; esRechazo?: boolean },
  ) => ({
    estadoPedido: payload.esRechazo ? "RECHAZADO" : "CANCELADO",
    razonCancelacion: payload.razon,
  }),
});

/**
 * 3. Definición del Workflow Builder
 */
const wf = defineWorkflow<EstadoPedido, ServiciosPedido, MutacionesPedido>();

type NodosPedidoList =
  | "start"
  | "evaluar_descuento_vip"
  | "aplicar_descuento"
  | "esperar_webhook_pago"
  | "procesar_confirmacion_pago"
  | "delay_preparacion_logistica"
  | "despachar_pedido"
  | "fin_exito"
  | "fin_cancelado"
  | "fin_pago_fallido";

/**
 * 4. Factoría del Grafo del Workflow Multinodo (Utilizando Nodos Nativos del Motor)
 */
function crearGrafoPedido(): WorkflowGraph<
  EstadoPedido,
  ServiciosPedido,
  NodosPedidoList,
  MutacionesPedido
> {
  return wf.create({
    id: "fulfillment_pedidos_v1",
    nodes: {
      start: {
        type: "action",
        action: (state, ctx) => {
          const tieneStock = ctx.services.verificarStock(state.idPedido);
          if (!tieneStock) {
            ctx.mutate("MARCAR_CANCELADO", { razon: "SIN_STOCK" });
            return "ERROR_SIN_STOCK";
          }
          ctx.mutate("MARCAR_PENDIENTE_PAGO", { monto: state.monto });
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
        otherwise: "esperar_webhook_pago",
      },
      aplicar_descuento: {
        type: "action",
        action: (state, ctx) => {
          ctx.mutate("APLICAR_DESCUENTO", { porcentaje: 10 });
        },
        onSuccess: "esperar_webhook_pago",
      },
      esperar_webhook_pago: {
        type: "suspend",
        eventName: "REGISTRAR_PAGO",
        onResume: "procesar_confirmacion_pago",
      },
      procesar_confirmacion_pago: {
        type: "action",
        action: (state, ctx) => {
          const payload = ctx.signalPayload as
            | { txId: string; exitoso: boolean; razonFallo?: string }
            | undefined;

          if (!payload || !payload.exitoso) {
            const razon = payload?.razonFallo ?? "PAGO_RECHAZADO_POR_BANCO";
            ctx.mutate("MARCAR_CANCELADO", { razon, esRechazo: true });
            ctx.services.notificarCliente(
              `El pago del pedido ${state.idPedido} fue rechazado. Razon: ${razon}`,
            );
            return "ERROR_PAGO_RECHAZADO";
          }

          ctx.mutate("REGISTRAR_PAGO", { txId: payload.txId });
          ctx.services.registrarTransaccion(
            state.idPedido,
            payload.txId,
            state.monto,
          );
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
          ctx.mutate("COMPLETAR_DESPACHO");
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
 * 5. Suite de Pruebas de Integración End-to-End
 */
test("Integration E2E: Flujo Feliz Completo Cliente VIP (Multinodo, Nodo Nativo Suspend, Delay y Reanudación)", async () => {
  const graph = crearGrafoPedido();

  const transaccionesRegistradas: Array<{ id: string; txId: string; monto: number }> = [];
  const notificaciones: string[] = [];
  const despachos: string[] = [];
  let msDelayLogistica = 0;
  const mutacionesAplicadas: string[] = [];

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

  // FASE 1: Ejecución Inicial hasta Suspensión por Nodo Nativo 'suspend'
  const resInicial = await executeWorkflow({
    graph,
    initialState: estadoInicial,
    services: servicios,
    mutations: mutacionesPedido,
    onMutation: (key) => {
      mutacionesAplicadas.push(key);
    },
    delayFn: async (ms) => {
      msDelayLogistica = ms;
    },
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.suspendedAtNodeId, "esperar_webhook_pago");
    assert.equal(resInicial.targetOnResume, "procesar_confirmacion_pago");
    assert.equal(resInicial.eventName, "REGISTRAR_PAGO");
    // Descuento del 10% de 500 = 50 -> Monto final 450
    assert.equal(resInicial.finalState.monto, 450);
    assert.equal(resInicial.finalState.descuentoAplicado, 50);
    assert.equal(resInicial.finalState.estadoPedido, "PENDIENTE_PAGO");
    assert.equal(resInicial.history.length, 4);
    assert.equal(resInicial.history[0].nodeId, "start");
    assert.equal(resInicial.history[1].nodeId, "evaluar_descuento_vip");
    assert.equal(resInicial.history[2].nodeId, "aplicar_descuento");
    assert.equal(resInicial.history[3].nodeId, "esperar_webhook_pago");
  }

  assert.deepEqual(mutacionesAplicadas, [
    "MARCAR_PENDIENTE_PAGO",
    "APLICAR_DESCUENTO",
  ]);

  // FASE 2: Reanudación tras recibir Webhook de Pago Exitoso con signalPayload
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      mutations: mutacionesPedido,
      onMutation: (key) => {
        mutacionesAplicadas.push(key);
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
      assert.equal(resFinal.history[0].nodeId, "procesar_confirmacion_pago");
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

    assert.deepEqual(mutacionesAplicadas, [
      "MARCAR_PENDIENTE_PAGO",
      "APLICAR_DESCUENTO",
      "REGISTRAR_PAGO",
      "COMPLETAR_DESPACHO",
    ]);
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

  // 1. Ejecución Inicial -> Pasa por 'choose' y salta 'aplicar_descuento' directo a 'esperar_webhook_pago'
  const resInicial = await executeWorkflow({
    graph,
    initialState: estadoInicial,
    services: servicios,
    mutations: mutacionesPedido,
  });

  assert.equal(resInicial.status, "SUSPENDED");
  if (resInicial.status === "SUSPENDED") {
    assert.equal(resInicial.suspendedAtNodeId, "esperar_webhook_pago");
    assert.equal(resInicial.finalState.monto, 200); // Sin descuento
    assert.equal(resInicial.finalState.descuentoAplicado, 0);
    assert.equal(resInicial.history.length, 3);
    assert.equal(resInicial.history[0].nodeId, "start");
    assert.equal(resInicial.history[1].nodeId, "evaluar_descuento_vip");
    assert.equal(resInicial.history[2].nodeId, "esperar_webhook_pago");
  }

  // 2. Reanudación exitosa
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      mutations: mutacionesPedido,
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
    mutations: mutacionesPedido,
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

  // 1. Ejecución Inicial hasta Suspensión
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
    mutations: mutacionesPedido,
  });

  assert.equal(resInicial.status, "SUSPENDED");

  // 2. Reanudación con Payload de Pago Fallido/Rechazado
  if (resInicial.status === "SUSPENDED") {
    const resFinal = await resumeWorkflow(resInicial, {
      graph,
      services: servicios,
      mutations: mutacionesPedido,
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
      assert.equal(resFinal.history[0].nodeId, "procesar_confirmacion_pago");
      assert.equal(resFinal.history[1].nodeId, "fin_pago_fallido");
    }

    assert.equal(notificaciones.length, 1);
    assert.equal(
      notificaciones[0],
      "El pago del pedido PED-FAIL-PAYMENT fue rechazado. Razon: FONDOS_INSUFICIENTES",
    );
  }
});
