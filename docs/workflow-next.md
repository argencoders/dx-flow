# Motor de Orquestación de Workflows por Inyección de Funciones (Pipeline Atómico)

---

## 1. Requisitos de Diseño

- **Arquitectura de Grafo 100% Declarativa y Estática:** Eliminación de `ctx.next()` en favor de transiciones explícitas (`onSuccess`, `onError`, `choices`, `otherwise`, `onTimeout`). Permite análisis estático del grafo sin sorpresas en producción.
- **Inmutabilidad en Acción:** El estado provisto a los callbacks de los nodos es strictly `DeepReadonly<TState>`, forzando a que cualquier mutación se realice de forma controlada a través del canal de la factoría.
- **Mutaciones Fuertemente Tipadas:** El método `ctx.mutate()` está acoplado de forma tiránica a los payloads reales y a las llaves de las mutaciones del proyecto (`TMutations`), impidiendo la inserción de objetos libres.
- **Arquitectura Basada en Plugins (Cero Switch):** Quedan prohibidos los bloques `switch` monolíticos en el motor. La fisonomía de los nodos es infinitamente extensible a nivel de propiedades mediante _Declaration Merging_ sobre la interfaz central.
- **DX Excepcional en Tipo e Inferencia:**
  - `type` sugiere autocompletado en el IDE (`"action" | "choose" | "delay" | "end"`).
  - `action` infiere automáticamente el tipo de retorno desde `keyof onError | void`.
  - `onError` infiere destinos válidos de `TNodesList` de forma nativa **sin requerir `as const`** y bloquea destinos inexistentes.

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

- [x] Crear el configurador de orden superior `defineWorkflow<TState, TRegistry, TMutations>()`.
- [x] Implementar el validador homórfico con inferencia nativa de `keyof onError`, autocompletado en `type`, `onSuccess`, `onError` y bloqueo de destinos inexistentes sin `as const`.
- [x] Certificar con aserciones rigurosas de fallos localizados que el editor detecta destinos falsos y payloads erróneos de inmediato (`factory.test.ts`).

### 🔄 Paso 4: El Orquestador en Runtime por Delegación (`src/workflow/engine.ts`)

- [x] **Fase 4.1:** Handler base y contratos de ejecutor de nodos (`src/workflow/node-handler.ts` y `src/workflow/node-handler.test.ts`).
- [x] **Fase 4.2:** Manejador atómico para nodos `action` con resolución `void -> onSuccess` y `string -> onError` (`src/workflow/node-action.ts` y `src/workflow/node-action.test.ts`).
- [x] **Fase 4.3:** Manejador atómico para nodos `choose` con evaluación secuencial first-match y escape `otherwise` (`src/workflow/node-choose.ts` y `src/workflow/node-choose.test.ts`).
- [x] **Fase 4.4:** Manejador atómico para nodos `delay` (`src/workflow/node-delay.ts` y `src/workflow/node-delay.test.ts`).
- [x] **Fase 4.5:** Manejador atómico para nodos `end` (`src/workflow/node-end.ts` y `src/workflow/node-end.test.ts`).
- [x] **Fase 4.6:** Registro central de handlers sin `switch` (`src/workflow/node-handlers.ts` y `src/workflow/node-handlers.test.ts`).
- [ ] **Fase 4.7:** Motor principal de ejecución de workflows (`src/workflow/engine.ts` y `src/workflow/engine.test.ts`).
- [ ] **Fase 4.8:** Test de integración e2e multinodo simulando cobro recurrente (`src/workflow/integration.test.ts`).

### ⬜ Paso 5: Analizador Estático de Topología del Grafo (`src/workflow/analyzer.ts`)

> **Factibilidad:** **¡Factible de inmediato desde el Paso 3!** Dado que el objeto devuelto por `factory.create()` es 100% declarativo y estático, se puede analizar la estructura del grafo sin ejecutar runtime.

- [ ] **Auditoría de Alcanzabilidad (Reachability):** Algoritmo BFS/DFS que verifique que todos los nodos declarados en el grafo son alcanzables desde el nodo `start`.
- [ ] **Detección de Callejones sin Salida y Ciclos Infinitos:** Garantizar que todo camino navegable tenga al menos una ruta de salida que desemboque en un nodo de tipo `end`.
- [ ] **Detección de Nodos Huérfanos/Aislados:** Identificar nodos declarados en `nodes` a los que ninguna transición (`onSuccess`, `onError`, `choices`, `otherwise`, `onTimeout`) apunta.
- [ ] **Suite de Pruebas Atómicas:** `src/workflow/analyzer.test.ts`.

### ⬜ Paso 6: Exportadores Visuales e Interoperabilidad (Wishlist BPMN & Mermaid) (`src/workflow/exporters/`)

> **Factibilidad:** **¡Factible de inmediato desde el Paso 3!** Cualquier instancia de grafo producida por la factoría contiene toda la metadata necesaria para traducirse a formatos visuales estándar.

- [ ] **Exportador Mermaid.js (`src/workflow/exporters/mermaid.ts`):**
  - Generar diagramas de flujo `graph TD` con nodos etiquetados por tipo (`action`, `choose` en rombo, `delay` en reloj, `end` en círculo doble).
  - Mapear las aristas con sus condiciones (`onSuccess`, `onError[KEY]`, `otherwise`, `onTimeout`).
- [ ] **Exportador BPMN 2.0 XML / Camunda (`src/workflow/exporters/bpmn.ts`):**
  - Generar el esquema estándar XML `bpmn:definitions` compatible con **Camunda Modeler**, **bpmn-js** o la extensión de VSCode Camunda.
  - Traducir `action` ➔ `bpmn:task` / `bpmn:serviceTask`.
  - Traducir `choose` ➔ `bpmn:exclusiveGateway`.
  - Traducir `delay` ➔ `bpmn:intermediateCatchEvent` (Timer).
  - Traducir `end` ➔ `bpmn:endEvent`.
  - Traducir las transiciones a `bpmn:sequenceFlow`.
- [ ] **Suite de Pruebas de Exportación:** `src/workflow/exporters/mermaid.test.ts` y `bpmn.test.ts`.
