# Motor de Orquestación de Workflows por Inyección de Funciones (Pipeline Atómico)

---

## 1. Requisitos de Diseño

- **Inferencia Pasiva de Destinos:** Las funciones de navegación `context.next(destination)` validan en tiempo de diseño que el string `destination` pertenezca estrictamente a las llaves de los nodos declarados en el grafo, sin obligar al usuario a usar ruidos sintácticos.
- **Inmutabilidad en Acción:** El estado provisto a los callbacks de los nodos es estrictamente `DeepReadonly<TState>`, forzando a que cualquier mutación se realice de forma controlada a través del canal de la factoría.
- **Mutaciones Fuertemente Tipadas:** El método `ctx.mutate()` está acoplado de forma tiránica a los payloads reales y a las llaves de las mutaciones del proyecto (`TMutations`), impidiendo la inserción de objetos libres.
- **Arquitectura Basada en Plugins (Cero Switch):** Quedan prohibidos los bloques `switch` monolíticos en el motor. La fisonomía de los nodos es infinitamente extensible a nivel de propiedades mediante _Declaration Merging_ sobre la interfaz central.

---

## 2. Checklist de Ejecución (Estado de la Arquitectura)

### ✅ Paso 1: El Contexto de Ejecución y Destinos (`src/workflow/context.ts`)

- [x] Diseñar la interfaz genérica `WorkflowContext` acoplada a la lista de nodos y a las mutaciones tipadas del negocio.
- [x] Implementar el constructor funcional `createRuntimeContext` para mapear el despachador físico en runtime.
- [x] Certificar en aislamiento estático y físico las firmas mediante su suite de tests `context.test.ts`.

### ✅ Paso 2: El Registro Modular de Fisonomías (`src/workflow/validator.ts`)

- [x] Diseñar la interfaz base extensible `NodeDefinitions` para albergar las firmas de los nodos `action`, `choose`, `delay` y `end`.
- [x] Eliminar las importaciones acopladas hacia el core de `state`, dándole autonomía total al módulo de procesos.
- [x] Certificar la capacidad de inyección de nuevos tipos de nodos personalizados mediante pruebas de _Declaration Merging_ unitarias.

### ✅ Paso 3: La Factoría Conectora e Inferencia de Propiedades (`src/workflow/factory.ts`)

- [x] Crear el configurador de orden superior `defineWorkflow<TState, TRegistry, TMutations>()`.
- [x] Implementar el tipo auxiliar `ValidateNodeProps` encargado de auditar de forma profunda propiedad por propiedad en lugar de evaluar objetos completos, eliminando colapsos rígidos a `never`.
- [x] Certificar con aserciones rigurosas de fallos localizados que el editor detecta destinos falsos y payloads erróneos de inmediato.

### ⬜ Paso 4: El Orquestador en Runtime por Delegación (`src/workflow/engine.ts`)

- [ ] Desarrollar el loop asíncrono y extensible que navegue deterministamente por los nodos inyectados.
- [ ] Implementar el sistema de orquestación delegando la lógica de ejecución directamente a estrategias individuales por tipo de nodo para erradicar el switch core.
- [ ] Escribir la suite de integración de runtime definitiva emulando el proceso completo de cobro recurrente.
