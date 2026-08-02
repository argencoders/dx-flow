# Motor de Orquestación de Workflows por Inyección de Funciones (Pipeline Atómico)

---

## 1. Requisitos de Diseño

- **Inferencia Pasiva de Destinos:** Las funciones de navegación `context.next(destination)` deben validar en tiempo de diseño que el string `destination` pertenezca estrictamente a las llaves de los nodos declarados en el grafo.
- **Inmutabilidad en Acción:** El estado provisto a los callbacks de acción debe ser estrictamente `DeepReadonly<TState>`, forzando a que cualquier mutación se realice a través del canal controlado del contexto.
- **Cero 'as const':** El andamiaje se basará en funciones factoría que capturen los literales de forma pasiva por posición genérica.

---

## 2. Checklist de Ejecución Paso a Paso

### ⬜ Paso 1: El Contexto de Ejecución y Destinos (`src/workflow/context.ts`)

- [ ] Diseñar el tipo utilitario `WorkflowContext<TState, TNodesList>` que exponga las firmas de `.mutate()` y `.next()`.
- [ ] Blindar `.next(N)` para que solo acepte strings pertenecientes a `TNodesList`.
- [ ] Escribir sus aserciones unitarias aisladas en `context.test.ts`.

### ⬜ Paso 2: El Validador de Firmas de Nodos (`src/workflow/validator.ts`)

- [ ] Diseñar el tipo unitario para el nodo `ActionNode` alimentado por el nuevo contexto.
- [ ] Diseñar los tipos unitarios aislados para `ChooseNode`, `DelayNode` y `EndNode`.
- [ ] Probar cada validador de nodo por separado de forma atómica en `validator.test.ts`.

### ⬜ Paso 3: La Factoría Conectora (`src/workflow/factory.ts`)

- [ ] Crear la función `defineWorkflow<TState, TRegistry>()` que use el currying para capturar las dependencias.
- [ ] Implementar el método `.create()` que infiera dinámicamente el diccionario de nodos del usuario y lo use como la lista blanca de destinos para el paso anterior.
- [ ] Validar con pruebas unitarias státicas que detecta destinos inválidos en el acto.

### ⬜ Paso 4: El Orquestador en Runtime (`src/workflow/engine.ts`)

- [ ] Desarrollar el loop asíncrono que ejecute los callbacks pasándoles el estado clonado y el objeto context en runtime, resolviendo las redirecciones secuenciales.
