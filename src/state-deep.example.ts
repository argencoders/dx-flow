import { IsValidState } from "./state-deep.js";

// 1. Definimos una clase Store genérica que exige que su estado sea válido
class Store<TState> {
  private _state: TState;

  // Forzamos a que el constructor solo acepte un estado si cumple con las reglas del framework
  constructor(initialState: IsValidState<TState>) {
    this._state = initialState as TState;
  }

  public get state(): Readonly<TState> {
    return this._state;
  }
}

// ============================================================================
// 🎮 ESCENARIO 1: CONFIGURACIÓN CORRECTA (El desarrollador feliz)
// ============================================================================

interface MiAppState {
  sesion: {
    token: string;
    activo: boolean;
  };
  tags: string[];
}

const estadoInicialValido: MiAppState = {
  sesion: {
    token: "jwt_123",
    activo: true,
  },
  tags: ["admin", "premium"],
};

// ✅ Todo compila de forma impecable. El Store se inicializa sin problemas.
const appStore = new Store<MiAppState>(estadoInicialValido);
console.log("Store creado con éxito:", appStore.state.sesion.token);

// ============================================================================
// 🛑 ESCENARIO 2: INTENTOS DE SABOTAJE (Detección de errores en tiempo de diseño)
// ============================================================================

// Caso de Error A: Estructura demasiado profunda (Supera el MaxLevel=2 por defecto)
interface EstadoInvalidoPorNivel {
  ajustes: {
    interfaz: {
      colores: {
        primario: string; // ❌ Nivel 4: Demasiado profundo para el Store
      };
    };
  };
}

const estadoDeepInvalido: EstadoInvalidoPorNivel = {
  ajustes: { interfaz: { colores: { primario: "#000" } } },
};

// @ts-expect-error - El editor pintará esto en rojo inmediatamente con nuestro mensaje semántico
const storeRotoPorNivel = new Store<EstadoInvalidoPorNivel>(estadoDeepInvalido);

// Caso de Error B: El programador mete comportamiento (Funciones) dentro del estado de datos
interface EstadoConTrampa {
  datos: {
    id: string;
    obtenerNombre: () => string; // ❌ Prohibido: El estado solo debe contener datos serializables
  };
}

const estadoConFuncion: EstadoConTrampa = {
  datos: {
    id: "user_456",
    obtenerNombre: () => "Juan",
  },
};

// @ts-expect-error - Bloqueado en el acto informando que se detectó un valor prohibido
const storeRotoPorFuncion = new Store<EstadoConTrampa>(estadoConFuncion);
