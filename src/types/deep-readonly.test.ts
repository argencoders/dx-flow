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
  // --- NUEVOS CAMPOS: Para validar tipos nativos ---
  creadoEn: Date;
  patronValidacion: RegExp;
  cacheSesiones: Map<string, number>;
  setPermisos: Set<string>;
}

type EstadoSeguro = DeepReadonly<EstadoTest>;

test("Verificación estática de tipos para DeepReadonly", () => {
  // Estas funciones no se ejecutan. El compilador TS validará los tipos estáticamente.

  function evaluarLectura(estado: EstadoSeguro) {
    // Pruebas originales válidas
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

    // ✅ NUEVO: Validación de métodos nativos en tipos complejos preservados
    const epoch: number = estado.creadoEn.getTime();
    const esValido: boolean = estado.patronValidacion.test("admin");
    const tieneSesion: boolean = estado.cacheSesiones.has("user_123");
    const tienePermiso: boolean = estado.setPermisos.has("read");
  }

  function evaluarMutacion(estado: EstadoSeguro) {
    // @ts-expect-error - ERROR: No se puede reasignar una propiedad de primer nivel
    estado.id = "nuevo_id";

    // @ts-expect-error - ERROR: No se puede mutar una propiedad anidada profundamente
    estado.config.reintentosMaximos = 10;

    // @ts-expect-error - ERROR: No se puede reasignar la referencia del array
    estado.historialErrores = ["NUEVO_ERROR"];

    // @ts-expect-error - ERROR: Los arrays de solo lectura bloquean el método mutador .push
    estado.historialErrores.push("ERROR_CRITICO");

    // @ts-expect-error - ERROR: No se puede alterar un elemento del array por su índice
    estado.historialErrores[0] = "ERROR_MODIFICADO";

    if (estado.datosFacturacion) {
      // @ts-expect-error - ERROR: Las propiedades internas de un objeto opcional también son readonly
      estado.datosFacturacion.ruc = "456";
    }

    // @ts-expect-error - ERROR: El array interno de objetos también debe bloquear métodos mutadores
    estado.metadatos.tags.push({ id: 1, nombre: "nuevo-tag" });

    // @ts-expect-error - ERROR: Los objetos que viven dentro de un array también deben volverse readonly recursivamente
    estado.metadatos.tags[0].nombre = "cambio_nombre_tag";

    // @ts-expect-error - ERROR: No se puede reasignar la instancia de un objeto nativo
    estado.creadoEn = new Date();

    // @ts-expect-error - ERROR: No se puede reasignar la instancia del Map
    estado.cacheSesiones = new Map();
  }
});
