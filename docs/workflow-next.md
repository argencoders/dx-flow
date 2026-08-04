# Motor de Orquestación de Workflows por Inyección de Funciones (Pipeline Atómico & Durable)

---

## 1. Requisitos de Diseño y Arquitectura Avanzada

- **Arquitectura de Grafo 100% Declarativa y Estática:** Eliminación de `ctx.next()` en favor de transiciones explícitas (`onSuccess`, `onError`, `choices`, `otherwise`, `onTimeout`). Permite análisis estático del grafo sin sorpresas en producción.
- **Ejecución Durable, Suspendible y Reanudable (Stateful / Resumable Engine):** El motor soporta tres resultados fundamentales (`NEXT`, `END`, `SUSPEND`). Ante señales externas (webhooks, temporizadores duraderos o aprobaciones humanas), el flujo deshidrata su estado, suspende el bucle sin bloquear CPU y reanuda exactamente desde el nodo congelado.
- **Inmutabilidad en Acción:** El estado provisto a los callbacks de los nodos es strictly `DeepReadonly<TState>`, forzando a que cualquier mutación se realice de forma controlada a través del canal de la factoría.
- **Mutaciones Fuertemente Tipadas:** El método `ctx.mutate()` está acoplado de forma tiránica a los payloads reales y a las llaves de las mutaciones del proyecto (`TMutations`), impidiendo la inserción de objetos libres.
- **Arquitectura Basada en Plugins (Cero Switch):** Quedan prohibidos los bloques `switch` monolíticos en el motor. La fisonomía de los nodos es infinitamente extensible mediante _Declaration Merging_ sobre la interfaz central.
- **DX Excepcional en Tipo e Inferencia:**
  - `type` sugiere autocompletado en el IDE (`"action" | "choose" | "delay" | "end" | "parallel" | "subworkflow"`).
  - Autocompletado y bloqueo de destinos inexistentes en `onSuccess`, `onError`, `choices` y `otherwise` sin requerir `as const`.

---

## 2. Checklist de Ejecución (Estado de la Arquitectura)

### ✅ Paso 1: El Contexto de Ejecución y Destinos (`src/workflow/context.ts`)

- [x] Diseñar la interfaz genérica `WorkflowContext` acoplada a la lista de nodos y a las mutaciones tipadas del negocio.
- [x] Implementar el constructor funcional `createRuntimeContext` para mapear el despachador físico en runtime.
- [x] Certificar en aislamiento estático y físico las firmas mediante su suite de tests `context.test.ts`.

### ✅ Paso 2: El Registro Modular de Fisonomías (`src/workflow/validator.ts`)

- [x] Diseñar la interfaz base extensible `NodeDefinitions` para albergar las firmas de los nodos `action`, `choose`, `delay` y `end`.
- [x] Eliminar las importaciones acopladas hacia el core de `state`, dándole autonomía total al módulo de procesos.
- [x] Certificar la capacidad de inyección de nuevos tipos de nodos personalizados mediante pruebas de _Declaration Merging_ unitarias (`validator.test.ts`).

### ✅ Paso 3: La Factoría Conectora e Inferencia de Propiedades (`src/workflow/factory.ts`)

- [x] Crear el configurador de orden superior `defineWorkflow<TState, TServices, TMutations>()`.
- [x] Implementar el validador homórfico con inferencia nativa de `keyof onError`, autocompletado en `type`, `onSuccess`, `onError` y bloqueo de destinos inexistentes sin `as const`.
- [x] Certificar con aserciones rigurosas de fallos localizados que el editor detecta destinos falsos y payloads erróneos de inmediato (`factory.test.ts`).

### 🔄 Paso 4: El Orquestador en Runtime Durable y Delegado (`src/workflow/engine.ts`)

- [x] **Fase 4.1:** Handler base y contratos de ejecutor de nodos (`src/workflow/node-handler.ts` y `src/workflow/node-handler.test.ts`).
- [x] **Fase 4.2:** Manejador atómico para nodos `action` con resolución `void -> onSuccess` y `string -> onError` (`src/workflow/node-action.ts` y `src/workflow/node-action.test.ts`).
- [x] **Fase 4.3:** Manejador atómico para nodos `choose` con evaluación secuencial first-match y escape `otherwise` (`src/workflow/node-choose.ts` y `src/workflow/node-choose.test.ts`).
- [x] **Fase 4.4:** Manejador atómico para nodos `delay` (`src/workflow/node-delay.ts` y `src/workflow/node-delay.test.ts`).
- [x] **Fase 4.5:** Manejador atómico para nodos `end` (`src/workflow/node-end.ts` y `src/workflow/node-end.test.ts`).
- [x] **Fase 4.6:** Registro central de handlers de runtime sin `switch` (`src/workflow/node-handlers.ts` y `src/workflow/node-handlers.test.ts`).
- [x] **Fase 4.7:** Motor principal de ejecución durable con soporte para **Suspensión, Reanudación y Deshidratación** (`executeWorkflow`, `resumeWorkflow`, `src/workflow/engine.ts` y `src/workflow/engine.test.ts`).
  - Inferencia automática desde `WorkflowGraph` para `initialState`, `services` y `onMutation`.
  - Integración nativa con `defineMutations` de Sprint 1 (`src/mutations/mutations.ts`) eliminando el `reducer` manual.
  - Hook observador `onMutation(key, payload, newState)` para auditoría y EventLog.
- [x] **Fase 4.8:** Test de integración e2e multinodo simulando suspensión por webhook/evento externo (`src/workflow/integration.test.ts`).

### 🔄 Paso 5: Fisonomías Avanzadas y Azúcar Sintáctico (`src/workflow/features/`)

- [x] **Fase 5.1: Secuencias Implícitas, Pipelines y Nodos Anónimos/Inline:** Ejecución secuencial de pasos inline puros (`InlineActionStep`, `InlineDelayStep`, `InlineChooseStep` y `Shorthand Action Callbacks`). Propagación de estado mutado en tiempo real entre pasos, fallthrough en `choose` y suspensión durable por sub-paso (`#step-i`).
- [x] **Fase 5.2: Bucle e Iteración Condicional (`type: "repeat"`):** Estructura de iteración condicional `until(state)` y límites por `count`, con soporte dual para `target` (clave registrada) y `steps: Array<InlineStep>` (pipeline de pasos inline puros con propagación de estado).
- [x] **Fase 5.3: Paralelismo y Concurrencia (`type: "parallel"`):** Ejecución de múltiples ramas en paralelo (`branches`) con barrera de sincronización convergente, con soporte dual para `Array<TNodesList>` (claves registradas) y `Array<InlineStep>` (ramas inline con contexto de mutación aislado).
- [x] **Fase 5.4: Políticas de Reintento (`RetryPolicy`):** Reintentos automáticos configurables con backoff exponencial, jitter, cap máximo y errores reintentables (`retryableErrors`) tanto en nodos `action` como en pasos inline `InlineActionStep`.
- [x] **Fase 5.5: Patrón Saga y Compensaciones:** Cancelaciones y rollbacks distribuidos ejecutando callbacks `compensate` en orden inverso ante fallos no recuperables tanto en nodos `action` como en pasos inline.
- [x] **Fase 5.6: Clasificación Semántica de Nodos Terminales (`result` en `node-end`):** Propiedad opcional `result?: "success" | "error" | "compensate" | "terminate"` (alineada con BPMN 2.0 End Event Result) con fallback automático a `"success"` para alimentar el analizador de topología y los exportadores diagramáticos.
- [x] **Fase 5.7: Inferencia Determinista del Nodo Inicial:** Resolución automática del nodo de entrada priorizando `startNodeId` explícito, la clave `"start"` si existe, o en su defecto la primera llave declarada sintácticamente en `nodes` aprovechando el orden de inserción garantizado por ECMAScript (`Object.keys(nodes)[0]`).
- [x] **Fase 5.8: Sub-Workflows (`type: "subworkflow"`):** Composición modular de flujos dentro de flujos, aislamiento/propagación de estado vía `input`/`output`, mapeo de errores `onError`, compensaciones Saga y transparencia de suspensión durable.

---

## 3. Wishlist y Sugerencias de DX Futuras

- **Fluent Node Builders (`node.action(...)`, `node.delay(...)`):**
  Helper opcional fuertemente tipado `node` retornado por `defineWorkflow()` para la construcción fluida de nodos. Se posterga en la wishlist por ser azúcar sintáctico opcional frente a la declaración explícita de objetos en `nodes`.
- **Aislamiento del Reporte de Error en `action` dentro de Pasos Inline:**
  En la versión actual de TypeScript, cuando un elemento de un arreglo/tupla (`steps: [...]`) no satisface la firma de retorno esperada en `action` (por ejemplo, al retornar un error no declarado en `onError`), la marca de error estático del compilador se coloca sobre la apertura del objeto del paso `{ type: "action", ... }` en lugar de ubicarse directamente sobre la clave de propiedad `action: (state, ctx) => ...`. Queda anotado en la wishlist investigar refinamientos de tipos o futuras versiones de TypeScript que permitan posicionar quirúrgicamente el error en la sub-propiedad `action`.
- **Estrategia de Fusión y Manejo de Conflictos en Mutaciones Concurrentes (`parallel`):**
  Analizar patrones avanzados de consolidación de estado (ej. merge profundo de parches, detección estática/dinámica de colisiones de campos o mutadores por slice de estado) cuando ramas concurrentes ejecutan `ctx.mutate()` en paralelo.
- **Inyección de Ejecutor por Contexto (IoC & Scope de Request HTTP / `hardwired`):**
  > [!WARNING]
  > **Advertencia de Arquitectura e Integración IoC:**
  > En escenarios donde el motor o los servicios sean instanciados mediante contenedores de inyección de dependencias (IoC Request-Scoped tipo `hardwired`, Inversify o NestJS) para trasladar el contexto de un Request HTTP hacia `services`, la importación diferida de `executeWorkflow` dentro de `nodeSubworkflowHandler` deberá evolucionar hacia la Inyección del Ejecutor vía `context` (`context.executeChildWorkflow(...)`). Esto evitará el acoplamiento a nivel de módulo y garantizará que los sub-workflows compartan transparentemente los contenedores de servicios con scope de solicitud.

---

## 4. Próximos Pasos (Paso 6 & Paso 7)

### ⬜ Paso 6: Analizador Estático de Topología del Grafo (`src/workflow/analyzer.ts`)

- [ ] **Auditoría de Alcanzabilidad (Reachability):** Algoritmo BFS/DFS que verifique que todos los nodos declarados en el grafo son alcanzables desde el nodo inicial (`start` o primer nodo).
- [ ] **Detección de Callejones sin Salida y Ciclos Infinitos:** Garantizar que todo camino navegable tenga al menos una ruta de salida que desemboque en un nodo de tipo `end` (auditando sus variantes `result`) o punto de suspensión.
- [ ] **Detección de Nodos Huérfanos/Aislados:** Identificar nodos declarados en `nodes` a los que ninguna transición apunta.
- [ ] **Suite de Pruebas Atómicas:** `src/workflow/analyzer.test.ts`.

### ⬜ Paso 7: Exportadores Visuales e Interoperabilidad (Mermaid & BPMN 2.0) (`src/workflow/exporters/`)

- [ ] **Exportador Mermaid.js (`src/workflow/exporters/mermaid.ts`):** Generar diagramas de flujo `graph TD` aplicando clases de estilo diferenciadas según la propiedad `result` en nodos `end`.
- [ ] **Exportador BPMN 2.0 XML / Camunda (`src/workflow/exporters/bpmn.ts`):** Generar XML estándar compatible con Camunda Modeler mapeando `result` a los subtipos oficiales `<bpmn:errorEventDefinition>`, `<bpmn:compensateEventDefinition>`, etc.
- [ ] **Suite de Pruebas de Exportación:** `src/workflow/exporters/mermaid.test.ts` y `bpmn.test.ts`.

### ⬜ Paso 8: Persistencia Durable, Adaptadores de DB y EventStore (`src/workflow/persistence/`)

- [ ] **Abstracción de Repositorio de Estado (`WorkflowStateRepository`):** Interfaz desacoplada para deshidratar (snapshot JSON de `finalState`, `suspendedAtNodeId`, `compensationStack` e `history`) y reanudar flujos congelados en bases de datos (Postgres, Redis, MongoDB, In-Memory).
- [ ] **Log de Auditoría y EventStore (`WorkflowEventStore`):** Registro inalterable append-only de mutaciones (`onMutation`) e historial de ejecución para trazabilidad de cumplimiento, auditoría y time-travel debugging.
- [ ] **Adaptadores del Mundo Real (Outbox Pattern & Event Listeners):** Despachador y receptor de eventos externos (webhooks, temporizadores distribuidos BullMQ/Redis, colas RabbitMQ/Kafka) integrados nativamente con `resumeWorkflow`.
- [ ] **Suite de Pruebas de Persistencia:** `src/workflow/persistence/repository.test.ts`.
