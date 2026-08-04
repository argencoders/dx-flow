# Guía de Uso: Analizador Estático de Topología del Grafo (`analyzer.ts`)

El **Analizador de Topología** (`src/workflow/analyzer.ts`) es una herramienta independiente y pura diseñada para realizar auditorías estáticas sobre grafos de workflow (`WorkflowGraph`) antes de su ejecución en runtime.

---

## 🎯 ¿Para qué sirve y cuándo utilizarlo?

1. **Pruebas Unitarias y CI/CD:** Garantiza que ningún desarrollador introduzca transiciones a nodos inexistentes, callejones sin salida o bucles infinitos en producción.
2. **Validación al Desplegar o Iniciar (Fail-Fast):** Audita el flujo al levantar la aplicación o cargar configuraciones dinámicas desde BD/JSON.
3. **Pre-requisito para Diagramación Visual:** Utilizado por los exportadores (Mermaid.js, BPMN 2.0) para verificar la consistencia estructural del grafo.

---

## 📖 API Principal

```ts
import { analyzeTopology } from "./src/workflow/analyzer.js";

const report = analyzeTopology(graph, options?);
```

### Opciones (`TopologyAnalysisOptions`)
- `startNodeId?: string`: (Opcional) Fuerza el nodo de inicio de la auditoría. Si no se provee, la inferencia determinista evalúa la clave `"start"` o, en su defecto, el primer nodo declarado en `nodes`.

### Resultado (`TopologyAnalysisResult`)

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `isValid` | `boolean` | `true` si el grafo no tiene errores estructurales. |
| `startNodeId` | `string \| undefined` | Nodo inicial resuelto para el análisis. |
| `nodesCount` | `number` | Total de nodos declarados en el grafo. |
| `reachableNodes` | `string[]` | Arreglo de IDs alcanzables desde `startNodeId`. |
| `unreachableNodes` | `string[]` | Nodos declarados pero inalcanzables (nodos huérfanos). |
| `isolatedNodes` | `string[]` | Nodos sin ninguna arista entrante (excluyendo el inicio). |
| `deadEndNodes` | `string[]` | Nodos de ejecución (no `end`) sin aristas salientes. |
| `unclosedCycles` | `string[][]` | Ciclos infinitos que no pueden desembocar en `end` ni suspensión. |
| `terminalNodes` | `string[]` | Nodos de tipo `end`. |
| `suspensionNodes` | `string[]` | Nodos de suspensión (`delay`, `subworkflow`). |
| `warnings` | `string[]` | Lista de advertencias (nodos inalcanzables/aislados). |
| `errors` | `string[]` | Lista de errores críticos que invalidan el grafo. |

---

## 🚀 Ejemplos Prácticos de Uso

### Ejemplo 1: Asertar la salud de un workflow en Tests (CI/CD)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeTopology } from "./src/workflow/analyzer.js";
import { miWorkflowCobro } from "./src/workflows/cobro.js";

test("Validar topología de miWorkflowCobro", () => {
  const result = analyzeTopology(miWorkflowCobro);

  // Asegura que no existan enlaces rotos ni callejones sin salida
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.unreachableNodes.length, 0);
});
```

### Ejemplo 2: Proteger la ejecución en Runtime (Fail-Fast)

```ts
import { analyzeTopology } from "./src/workflow/analyzer.js";
import { executeWorkflow } from "./src/workflow/core/engine.js";

async function iniciarProcesoDurable(graph, initialState, services) {
  // 1. Auditoría estática previa
  const analysis = analyzeTopology(graph);

  if (!analysis.isValid) {
    throw new Error(
      `No se puede ejecutar el workflow '${graph.id}'. Errores de topología:\n` +
      analysis.errors.join("\n")
    );
  }

  // 2. Ejecución segura
  return await executeWorkflow({ graph, initialState, services });
}
```

---

## 💡 Guía para Leer las Pruebas Unitarias (`src/workflow/analyzer.test.ts`)

La suite de tests de `analyzer.test.ts` está organizada en **6 bloques de escenarios atómicos**:

### 1. `Extracción de aristas salientes (extractOutgoingEdges)`
- **Qué prueba:** Verifica que el analizador sepa leer los diferentes tipos de transiciones según el tipo de nodo:
  - `action`: lee `onSuccess` y las llaves de `onError`.
  - `choose`: lee `choices[].nextNode`, `choices[].target` y `otherwise`.
  - `delay`: lee `onTimeout` y `onSuccess`.
  - `repeat`: lee `target` y `onSuccess`.
  - `end`: retorna `[]` (cero aristas salientes).

### 2. `Grafo Válido Lineal y Ramificado`
- **Qué prueba:** Un flujo completo feliz con `action` -> `choose` -> `delay` -> `end`.
- **Resultado esperado:** `isValid: true`, `errors.length: 0`, 5 nodos alcanzables.

### 3. `Detección of Nodos Huérfanos e Inalcanzables`
- **Qué prueba:** Nodos declarados en `nodes` a los que nadie apunta (`nodo_huerfano` y `nodo_aislado_total`).
- **Resultado esperado:** Aparecen en `unreachableNodes` e `isolatedNodes`, generando advertencias (`warnings`).

### 4. `Detección de Callejones sin Salida (Dead-End Nodes)`
- **Qué prueba:** Un nodo de tipo `action` que olvidó definir `onSuccess` u `onError`.
- **Resultado esperado:** Identificado en `deadEndNodes`, provocando `isValid: false` y un mensaje explícito en `errors`.

### 5. `Detección de Ciclos Infinitos sin Salida (Unclosed Cycles)`
- **Qué prueba:** Nodos `bucle_a` y `bucle_b` apuntándose mutuamente sin ninguna rama de escape a un nodo `end` ni `delay`.
- **Resultado esperado:** Identificado en `unclosedCycles` (ej: `['bucle_a', 'bucle_b']`), provocando `isValid: false`.

### 6. `Referencias a Destinos Inexistentes` e `Inferencia Determinista`
- **Qué prueba:** Comprueba la reacción ante typos en nombres de nodos (`nodo_fantasma`) y la capacidad de inferir el primer nodo cuando no existe la clave `"start"`.
