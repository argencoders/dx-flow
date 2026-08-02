# Pipeline de Mutaciones e Historial de Eventos Seguro

Sistema avanzado para el registro, validación sintáctica e inferencia de transformaciones de estado puras, desacoplado en tres etapas independientes de ejecución.

---

## 1. Filosofía de Arquitectura y Desacople

El módulo se rige bajo el principio de **Separación de Responsabilidades Estáticas y Dinámicas**:

1. **Fase de Diseño (Seguridad):** Al declarar las mutaciones, el framework inyecta automáticamente el modificador `DeepReadonly<TState>` para proteger el estado base de mutaciones accidentales por referencia y valida las llaves individualmente.
2. **Fase de Consumo (Pureza):** La factoría devuelve un mapa de funciones mutables puras (`UnwrapMutations`), removiendo los envoltorios de solo lectura. Esto permite que los motores de ejecución operen con tipos planos sin fricciones de asignabilidad.
3. **Servicios Autónomos (Desacople):** El Reducer y el Replay no contaminan el núcleo de las mutaciones; actúan como utilidades externas independientes que consumen las mutaciones como materia prima.

---

## 2. Especificación Técnica de los Componentes

### A. Factoría Configurativa (`defineMutations`)

Punto de entrada que captura el tipo del estado y permite inyectar interactivamente la estrategia de nomenclatura de `KeyStrategy` (por defecto `"SCREAMING_SNAKE"`).

- **Aislamiento de Errores:** Al validar las llaves de forma atómica indexando `KeyStrategy<K>[TCasing]`, TypeScript localiza el error pintando la línea roja **única y exclusivamente debajo de la clave que comete la infracción**, dejando el resto de la estructura limpia.
- **Flexibilidad en Retorno:** Soporta firmas de tipo `(state, payload) => TState | Partial<TState>`, permitiendo al desarrollador retornar solo un fragmento modificado del estado por comodidad (DX).

### B. El Despachador Autónomo (`createReducer`)

Función de orden superior separada del core que actúa como un despachador clásico (Dispatcher) en runtime. Toma el mapa de mutaciones puras y gestiona los ciclos de actualización combinando el estado anterior con el cambio devuelto: `{ ...state, ...result }`.

### C. Unión Discriminada Dinámica (`TypedEvent`)

El verdadero motor del viaje en el tiempo. Convierte el mapa de mutaciones en una unión de objetos fuertemente tipada:

```typescript
type TypedEvent<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (
    state: any,
    payload: infer PL,
  ) => any
    ? unknown extends PL
      ? { type: K }
      : { type: K; payload: PL }
    : never;
}[keyof TMethods];
```

- **Validación de Historial:** Genera una estructura del tipo `Event1 | Event2`. Si el evento no requiere payload, prohíbe explícitamente esa propiedad. Si la mutación exige un tipo (ej: `string`), el validador obliga a que el campo `payload` coincida de forma exacta en el array del historial (`EventLog`).

### D. El Motor de Replay (`createReplay`)

Servicio encargado de procesar la reproducción del historial cronológico de eventos tipados. Utiliza una reducción nativa en cascada (`eventLog.reduce`) para recrear secuencialmente el estado final resultante a partir de una foto inicial y un `EventLog` válido.

---

## 3. Ejemplo de Integración y Consumo Real

```typescript
import { defineMutations, createReducer, EventLog } from "./mutations.js";
import { createReplay } from "./replay.js";

interface AppState {
  token: string;
  clicks: number;
}

// 1. Declaración Protegida y Validada (Fase de Diseño)
const mutaciones = defineMutations<AppState>().create({
  INCREMENTAR: (state) => ({ clicks: state.clicks + 1 }),
  SET_TOKEN: (state, t: string) => ({ token: t }),
});

// 2. Consumo del Reducer Independiente
const reducer = createReducer<AppState, typeof mutaciones>(mutaciones);
const estadoSiguiente = reducer(
  { token: "", clicks: 0 },
  { type: "INCREMENTAR" },
);

// 3. Viaje en el Tiempo Seguro (Replay)
const replayService = createReplay<AppState, typeof mutaciones>(mutaciones);

// El compilador asiste y valida cada payload individual del historial
const historial: EventLog<typeof mutaciones> = [
  { type: "INCREMENTAR" },
  { type: "SET_TOKEN", payload: "jwt_safe_abc" },
];

const estadoReconstruido = replayService.play(
  { token: "", clicks: 0 },
  historial,
);
```
