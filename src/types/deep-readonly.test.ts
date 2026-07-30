/// <reference types="node" />
import { test } from "node:test";
import { DeepReadonly } from "./deep-readonly.js";

interface EstadoTest {
  id: string;
  config: {
    reintentosMaximos: number;
    alertasActivas: boolean;
  };
  historialErrores: string[];
  metadatos: {
    tags: { id: number; nombre: string }[];
  };
  metodoPago: "TARJETA" | "EFECTIVO" | null;
  datosFacturacion?: {
    ruc: string;
    direccion: string | null;
  };
}

type EstadoSeguro = DeepReadonly<EstadoTest>;

test("Verificación estática de tipos para DeepReadonly", () => {
  // Estas funciones no se ejecutan. El compilador TS validará los tipos

  function evaluarLectura(estado: EstadoSeguro) {
    const id: string = estado.id;
    const max: number = estado.config.reintentosMaximos;

    if (estado.metodoPago === "TARJETA") {
      const tipo: "TARJETA" = estado.metodoPago;
    }

    const erroresFiltrados = estado.historialErrores.filter((e) =>
      e.includes("404"),
    );
    const listaMapeada = estado.metadatos.tags.map((t) =>
      t.nombre.toUpperCase(),
    );
  }

  function evaluarMutacion(estado: EstadoSeguro) {
    // @ts-expect-error - ERROR: No se puede reasignar una propiedad de primer nivel
    estado.id = "nuevo_id";

    // @ts-expect-error - ERROR: No se puede mutar una propiedad anidada profundamente
    estado.config.reintentosMaximos = 10;

    // @ts-expect-error - ERROR: No se puede alterar un array por índice
    estado.historialErrores = "NUEVO_ERROR";

    // @ts-expect-error - ERROR: Los arrays de solo lectura bloquean el método mutador .push
    estado.historialErrores.push("ERROR_CRITICO");

    if (estado.datosFacturacion) {
      // @ts-expect-error - ERROR: Las propiedades internas de un objeto opcional también son readonly
      estado.datosFacturacion.ruc = "456";
    }
  }
});
