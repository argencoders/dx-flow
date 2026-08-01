# Motor de Mutaciones con Pipeline de Tres Etapas (Validación, Reducer y Replay)

---

## 1. Reglas de Diseño del Módulo

- **Validación Pasiva en Declaración:** Al escribir las mutaciones, el parámetro `state` debe ser inyectado automáticamente como `DeepReadonly<TState>`. Las llaves deben validarse bajo la estrategia `"SCREAMING_SNAKE"` por omisión.
- **Pureza Funcional:** Las mutaciones declaradas deben devolver un estado modificado (o un Partial del mismo) de tipo `TState` puro, sin rastro de modificadores de solo lectura.
- **Desacople de Consumo (Firma Pública):** El objeto resultante del pipeline debe ocultar el parámetro `state` en sus métodos públicos, exponiendo únicamente una firma ejecutable limpia de tipo `(payload) => void`.

---

## 2. Plan de Ejecución Paso a Paso (Checklist)

### ⬜ Etapa 1: El Validador e Interceptor de Firmas (`createMutations`)

- [ ] Diseñar el tipo utilitario `ValidateMutationsMap<TState, TMethods>` que obligue a cada función declarada a recibir `DeepReadonly<TState>` en su primer argumento y capturar el tipo exacto de su payload de manera estricta.
- [ ] Conectar la verificación de llaves con `ValidateObjectKeys<TMethods, "SCREAMING_SNAKE">` de forma implícita.
- [ ] Crear la primera capa del Currying (`defineMutations<TState>()`) que configure el tipo de estado una sola vez.

### ⬜ Etapa 2: El Motor del Reducer (Ejecución Central)

- [ ] Diseñar el tipo transformador de salida `PublicActions<TMethods>` que tome el mapa de mutaciones y remueva el primer parámetro (`state`), dejando firmas de tipo `(payload: TPayload) => void` (o sin parámetros si el payload es opcional).
- [ ] Implementar el método `.reducer(state, action)` que actúe como un despachador clásico (Dispatcher) mapeando el `action.type` directamente a la función de mutación correspondiente en tiempo de ejecución.

### ⬜ Etapa 3: El Motor de Replay (Viaje en el Tiempo)

- [ ] Definir la estructura estricta del evento serializable: `type ActionEvent = { type: string; payload?: any }`.
- [ ] Implementar el método `.replay(initialState, events[])` que tome un estado base inicial y un histórico de eventos, ejecutando el reducer de forma secuencial (reproducción del historial) para devolver el estado resultante final.
- [ ] Escribir la suite de pruebas integradas de ejecución real (`src/mutations/mutations.test.ts`).
