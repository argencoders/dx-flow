import { test } from "node:test";
import assert from "node:assert/strict";
import { exportToTextNarrative } from "./text-narrative.js";
import { defineWorkflow } from "../core/factory.js";

interface TestState {
  counter: number;
}

const wf = defineWorkflow<TestState, any>();

test("Workflow - Exporters Narrative: Generación de texto redactado con metadatos de negocio", () => {
  const graphMeta = {
    title: "Procesamiento de Pedidos E-Commerce",
    description: "Orquesta la cobranza, validación de stock y entrega de pedidos.",
    version: "1.2.0",
    author: "Equipo de Checkout",
    category: "Checkout",
    tags: ["pagos", "stock", "logistica"],
  };

  const graph = wf.create({
    id: "wf_narrativo_demo",
    // @ts-ignore - adjuntamos metadatos de negocio opcionales en runtime
    meta: graphMeta,
    nodes: {
      recibir_pedido: {
        type: "action",
        // @ts-ignore
        meta: {
          title: "Cobrar Pedido vía Stripe",
          description: "Realiza el débito en la tarjeta del cliente.",
          service: "PaymentService",
          owner: "@equipo-pagos",
          sideEffects: ["Cargo en Stripe", "Mutación BD: ORDERS"],
        },
        action: () => {},
        onSuccess: "validar_stock",
        onError: { SIN_STOCK: "cancelar_orden" },
      },
      validar_stock: {
        type: "choose",
        // @ts-ignore
        meta: {
          title: "Verificar Disponibilidad de Stock",
          description: "Consulta el inventario central.",
        },
        choices: [{ condition: (s) => s.counter > 0, nextNode: "esperar_despacho" }],
        otherwise: "cancelar_orden",
      },
      esperar_despacho: {
        type: "delay",
        // @ts-ignore
        meta: {
          title: "Ventana de Espera de Despacho",
          description: "Pausa el flujo durante 1 hora para asignación de repartidor.",
        },
        durationMs: 3600000,
        onTimeout: "completado",
      },
      completado: {
        type: "end",
        status: "DELIVERED",
        result: "success",
        // @ts-ignore
        meta: { title: "Pedido Entregado con Éxito" },
      },
      cancelar_orden: {
        type: "end",
        status: "CANCELLED",
        result: "error",
        // @ts-ignore
        meta: { title: "Pedido Cancelado por Fallo" },
      },
    },
  });

  const narrativeText = exportToTextNarrative(graph);

  assert.ok(narrativeText.includes("Procesamiento de Pedidos E-Commerce"));
  assert.ok(narrativeText.includes("Versión:** 1.2.0"));
  assert.ok(narrativeText.includes("PaymentService"));
  assert.ok(narrativeText.includes("Cargo en Stripe, Mutación BD: ORDERS"));
  assert.ok(narrativeText.includes("1h"));
  assert.ok(narrativeText.includes("🔴 Error"));
  assert.ok(narrativeText.includes("🟢 Éxito"));
});

test("Workflow - Exporters Narrative: Generación de Snapshot Markdown (text-narrative-snapshots.md)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const graphDemo = wf.create({
    id: "wf_demo_narrativo",
    // @ts-ignore
    meta: {
      title: "Workflow de Suscripción Premium",
      description: "Gestiona cobros recurrentes y notificaciones VIP.",
      version: "2.0.0",
      author: "Growth Team",
      category: "Billing",
    },
    nodes: {
      cobrar_suscripcion: {
        type: "action",
        // @ts-ignore
        meta: {
          title: "Procesar Cobro Recurrente",
          service: "BillingService",
          sideEffects: ["Cobro Automático", "Notificación Email"],
        },
        action: () => {},
        onSuccess: "notificar_vip",
        onError: { TARJETA_VENCIDA: "fin_fallo" },
      },
      notificar_vip: {
        type: "action",
        // @ts-ignore
        meta: {
          title: "Enviar Bienvenida VIP",
          service: "NotificationService",
        },
        action: () => {},
        onSuccess: "fin_exito",
      },
      fin_exito: { type: "end", status: "ACTIVE", result: "success" },
      fin_fallo: { type: "end", status: "FAILED", result: "error" },
    },
  });

  const textNarrative = exportToTextNarrative(graphDemo);

  const snapshotDir = path.join(process.cwd(), "src", "workflow", "exporters", "__snapshots__");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshotFilePath = path.join(snapshotDir, "text-narrative-snapshots.md");
  fs.writeFileSync(snapshotFilePath, textNarrative, "utf-8");
  assert.ok(fs.existsSync(snapshotFilePath));
});
