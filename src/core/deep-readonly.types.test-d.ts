import type { DeepReadonly } from "./deep-readonly.types.js";
import type { Equal, Expect, TypeSuite } from "./testing.types.js";

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
  creadoEn: Date;
  patronValidacion: RegExp;
  cacheSesiones: Map<string, number>;
  setPermisos: Set<string>;
}

/**
 * Firma estructural exacta que DeepReadonly<EstadoTest> DEBE producir.
 */
interface EstadoSeguroEsperado {
  readonly id: string;
  readonly config: {
    readonly reintentosMaximos: number;
    readonly alertasActivas: boolean;
  };
  readonly historialErrores: readonly string[];
  readonly metadatos: {
    readonly tags: readonly {
      readonly id: number;
      readonly nombre: string;
    }[];
  };
  readonly metodoPago: "TARJETA" | "EFECTIVO" | null;
  readonly datosFacturacion?: {
    readonly ruc: string;
    readonly direccion: string | null;
  };
  readonly creadoEn: Date;
  readonly patronValidacion: RegExp;
  readonly cacheSesiones: Map<string, number>;
  readonly setPermisos: Set<string>;
}

/**
 * SUITE DE PRUEBAS ESTÁTICAS DE TIPOS PARA DeepReadonly (0 Bytes Runtime)
 */
export type DeepReadonlyTestSuite = TypeSuite<
  [
    // ✅ 1. Validación de Inmutabilidad Recursiva Completa (Objetos, Anidados, Arrays y Opcionales)
    Expect<Equal<DeepReadonly<EstadoTest>, EstadoSeguroEsperado>>,

    // ✅ 2. Preservación de Primitivos sueltos
    Expect<Equal<DeepReadonly<string>, string>>,
    Expect<Equal<DeepReadonly<number>, number>>,
    Expect<Equal<DeepReadonly<boolean>, boolean>>,

    // ✅ 3. Preservación de Objetos Nativos Complejos (Date, RegExp, Map, Set)
    Expect<Equal<DeepReadonly<Date>, Date>>,
    Expect<Equal<DeepReadonly<RegExp>, RegExp>>,
    Expect<Equal<DeepReadonly<Map<string, number>>, Map<string, number>>>,
    Expect<Equal<DeepReadonly<Set<string>>, Set<string>>>,

    // ✅ 4. Inmutabilidad en Arrays de Objetos Anidados
    Expect<
      Equal<
        DeepReadonly<{ id: number; items: string[] }[]>,
        readonly { readonly id: number; readonly items: readonly string[] }[]
      >
    >,
  ]
>;
