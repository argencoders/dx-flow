// #region UTILITARIO: DEEP READONLY (Datos Serializables)

/**
 * Versión optimizada para estructuras serializables.
 * - Si es un Array: Lo transforma en un ReadonlyArray recurriendo recursivamente sobre sus elementos.
 * - Si es un Objeto plano: Hace cada propiedad 'readonly' y recurre sobre sus tipos.
 * - Si es un Primitivo: Lo devuelve intacto.
 */
export type DeepReadonly<T> = T extends any[]
  ? ReadonlyArray<DeepReadonly<T[number]>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// #endregion

// #region APLICACIÓN: CASOS DE ANÁLISIS ESTÁTICO: Escenarios simples

// Definiendo un estado complejo pero 100% serializable para la prueba
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
}

// Tipo bajo análisis
type EstadoSeguro = DeepReadonly<EstadoTest>;

// --- CASOS DE ÉXITO (Lo que el desarrollador SÍ debe poder hacer) ---
function evaluarLectura(estado: EstadoSeguro) {
  // 1. Lectura de primer nivel y propiedades anidadas
  const id: string = estado.id;
  const max: number = estado.config.reintentosMaximos;

  // 2. Uso seguro de métodos de lectura en Arrays (conserva prototipo de Array)
  const primerError = estado.historialErrores[0];
  const erroresFiltrados = estado.historialErrores.filter((e) =>
    e.includes("404"),
  );
  const listaMapeada = estado.metadatos.tags.map((t) => t.nombre.toUpperCase());
}

// --- CASOS DE FALLO (El compilador DEBE lanzar errores de asignación) ---
function evaluarMutacion(estado: EstadoSeguro) {
  // @ts-expect-error - ERROR: No se puede reasignar una propiedad de primer nivel
  estado.id = "nuevo_id";

  // @ts-expect-error - ERROR: No se puede mutar una propiedad anidada profundamente
  estado.config.reintentosMaximos = 10;

  // @ts-expect-error - ERROR: No se puede alterar un array por índice
  estado.historialErrores[0] = "NUEVO_ERROR";

  // @ts-expect-error - ERROR: Métodos mutadores de Array como .push() quedan deshabilitados
  estado.historialErrores.push("ERROR_CRITICO");

  // @ts-expect-error - ERROR: No se puede mutar un objeto dentro de una lista anidada
  estado.metadatos.tags[0].nombre = "Modificado";
}
// #endregion

// #region APLICACIÓN: CASOS DE ANÁLISIS ESTÁTICO: ESCENARIOS COMPLEJOS

interface EstadoComplejo {
  // Escenario 1: Nulos y Uniones Literales
  metodoPago: "TARJETA" | "EFECTIVO" | null;

  // Escenario 2: Estructuras Opcionales Complejas
  datosFacturacion?: {
    ruc: string;
    direccion: string | null;
  };
}

type EstadoSeguroComplejo = DeepReadonly<EstadoComplejo>;

// --- CASOS DE ÉXITO (Flujo Positivo) ---
function evaluarCasosComplejosExito(estado: EstadoSeguroComplejo) {
  // 1. Debe permitir leer y validar contra los tipos literales de la unión
  if (estado.metodoPago === "TARJETA") {
    const tipo: "TARJETA" = estado.metodoPago;
  }

  // 2. Debe permitir evaluar la existencia de propiedades opcionales
  if (estado.datosFacturacion) {
    const ruc: string = estado.datosFacturacion.ruc;

    // 3. Debe permitir que las subpropiedades manejen el nulo correctamente
    const dir: string | null = estado.datosFacturacion.direccion;
  }
}

// --- CASOS DE FALLO (El compilador DEBE bloquear las mutaciones) ---
function evaluarCasosComplejosFallo(estado: EstadoSeguroComplejo) {
  // @ts-expect-error - ERROR: No se puede reasignar la unión literal aunque se use un valor válido
  estado.metodoPago = "EFECTIVO";

  // @ts-expect-error - ERROR: No se puede reasignar el objeto opcional completo
  estado.datosFacturacion = { ruc: "123", direccion: null };

  if (estado.datosFacturacion) {
    // @ts-expect-error - ERROR: Las propiedades internas de un objeto opcional también deben ser readonly
    estado.datosFacturacion.ruc = "456";
  }
}
// #endregion

//----------------------------------------------------------

// #region FRAMEWORK: VALIDACIÓN DE ESTADO

export type StateKey = string;

/**
 * Validador estricto de estructuras de estado para TDD.
 */
export type IsValidState<T> = T extends (...args: any[]) => any
  ? never
  : T extends any[]
    ? never
    : keyof T extends StateKey
      ? T
      : never;

/**
 * TU PROPUESTA: Auxiliar de Aserción optimizado para TDD.
 * Valida la asignabilidad usando el constraint del genérico.
 */
type AssertValidState<T extends expected, expected = IsValidState<T>> = T;

// #endregion

// #region APLICACIÓN: CASOS DE PRUEBA ESTÁTICOS (Flujo Positivo)

interface EstadoValido1 {
  usuarioId: string;
  monto: number;
}

interface EstadoValido2 {
  configuracion: { tema: string };
  datos: number[];
}

// Flujo positivo: Estos tipos compilan limpiamente sin emitir errores
type Test1 = AssertValidState<EstadoValido1>;
type Test2 = AssertValidState<EstadoValido2>;

// #endregion

// #region APLICACIÓN: CASOS DE PRUEBA ESTÁTICOS (Flujo Negativo)

// Caso de Error A: Un array es rechazado porque string[] no extiende a 'never'
// @ts-expect-error - El tipo string[] no cumple con la restricción 'never'
type TestErrorArray = AssertValidState<string[]>;

// Caso de Error B: Una función es rechazada por el mismo motivo
// @ts-expect-error - Las funciones no son estados válidos
type TestErrorFuncion = AssertValidState<() => void>;

// Caso de Error C: Tipos primitivos sueltos son rechazados
// @ts-expect-error - Los tipos primitivos no extienden a 'never'
type TestErrorPrimitivo = AssertValidState<string>;

// Caso de Error D: Estructuras con llaves de tipo Symbol son rechazadas
declare const miSymbol: unique symbol;
interface EstadoConSymbol {
  [miSymbol]: string;
  idNormal: string;
}
// @ts-expect-error - Los objetos con símbolos no son serializables puros
type TestErrorSymbol = AssertValidState<EstadoConSymbol>;

// #endregion
