# Guía de Arquitectura y Verificación: `factory.test.ts`

Este documento resume las garantías arquitectónicas y los candados de seguridad estática certificados por la suite de pruebas `src/workflow/factory.test.ts`.

---

## 1. Configuración del Dominio (Líneas 5–23)

La factoría `defineWorkflow<TState, TServices, TMutations>()` se contextualiza una sola vez por cada tipo de proceso de negocio:

- **`TState`**: El estado inmutable del negocio (`intentos`, `nombre`, `esVip`).
- **`TServices`**: Registro de servicios/APIs inyectados (`pasarela.cobrar`).
- **`TMutations`**: Mutaciones puras y fuertemente tipadas permitidas (`INCREMENTAR_INTENTOS`, `CAMBIAR_NOMBRE`).

---

## 2. Flujo Completo Multinodo Feliz (Líneas 25–72)

Procesa y valida la autoinferencia homomórfica de un grafo complejo que combina todos los tipos nativos de nodos:

1. **`start` (`action` pura)**: Dispara mutaciones y navega a `onSuccess`.
2. **`intentar_cobro` (`action` con `onError`)**: Deduce de forma estática el retorno de claves de error y exige su mapeo determinístico.
3. **`evaluar_reintento` (`choose`)**: Evalúa reglas de decisión (`choices`) contra el estado inmutable y requiere una ruta de escape `otherwise`.
4. **`pausa` (`delay`)**: Pausa el flujo durante `durationMs` y transiciona hacia `onTimeout`.
5. **`fin_exito` / `fin_fallo` (`end`)**: Establece puntos de término declarando un estado de salida (`status`).

---

## 3. Los 5 Candados de Seguridad Estática (`@ts-expect-error`) (Líneas 74–149)

Garantiza que el compilador de TypeScript rechace cualquier intento de declarar un flujo inconsistente en tiempo de desarrollo:

| # | Infracción de Diseño | Mecanismo de Bloqueo |
|---|---|---|
| 1 | Apuntar `onTimeout` o `onSuccess` a un nodo inexistente | `testFalloDestinoInexistente` (Línea 75) |
| 2 | Declarar un `type` de nodo no registrado en el framework | `testFalloTipoNodoInvalido` (Línea 89) |
| 3 | Enviar un payload con tipo incorrecto a `ctx.mutate()` | `testFalloMutacionErroneaEnAction` (Línea 101) |
| 4 | Invocar una llave de mutación inexistente en `TMutations` | `testFalloMutacionInexistenteEnAction` (Línea 117) |
| 5 | Retornar una clave de error en `action` no mapeada en `onError` | `testFalloErrorNoMapeadoEnAction` (Línea 133) |
