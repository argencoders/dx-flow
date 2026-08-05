## Plan de Arquitectura: Versionado Dinámico, Depreciación y Parches de Compatibilidad
Este componente define las reglas de gobernanza para el ciclo de vida de los grafos en el ecosistema @dx-flow. Su objetivo es permitir la evolución del software de forma segura, protegiendo las instancias en ejecución y automatizando la compatibilidad.
## 1. Depreciación Automática en el Registro (Runtime)
Para evitar la gestión manual de obsolescencia, el Workflow Registry (el diccionario que almacena los grafos en producción) gestiona la depreciación de forma automática al arrancar la aplicación.

* Identificación de la Versión Activa: El registro analiza todos los grafos cargados para un mismo workflowId y detecta cuál es la versión más alta (utilizando comparación SemVer o numérica).
* Depreciación en Cascada: Automáticamente, todas las versiones inferiores cambian internamente su estado a status: "deprecated".
* Impacto en Nuevas Instancias: Si el sistema invoca executeWorkflow sin especificar versión, el motor siempre instanciará la más nueva. Intentar forzar la creación de un nuevo proceso con una versión deprecada arrojará un error.
* Impacto en Instancias Vivas: Los procesos suspendidos en la base de datos conservan su inmunidad; al despertar, invocarán resumeWorkflow apuntando estrictamente a la versión vieja con la que nacieron (Estrategia de Agotamiento Natural / Drain).

------------------------------
## 2. Flexibilidad Controlada: Parches 100% Compatibles
Si un desarrollador necesita corregir un error dentro de una función action de una versión existente (por ejemplo, corregir un bug de cálculo o cambiar un mensaje de log) sin alterar el flujo del negocio, el sistema permite aplicar un parche estructuralmente idéntico.
El Analizador Estático comparará el grafo original con el modificado antes del despliegue y solo dará luz verde si se cumplen estas reglas estrictas:

   1. Topología Idéntica: El número de nodos, sus nodeId y sus transiciones (onSuccess, onError, choices, otherwise) deben ser exactamente iguales. Queda prohibido añadir, eliminar o renombrar cajitas y flechas.
   2. Nodos de Suspensión Intactos: Los nodos de tipo delay o wait no pueden sufrir alteraciones en sus configuraciones de identidad o comportamiento de temporizador.
   3. Veredicto: Si la estructura física es idéntica, el Analizador aprueba el parche. El código modificado de la función action se actualiza de forma segura para todos los procesos que pasen por allí (tanto nuevos como reanudados).

------------------------------
## 3. Mecánica de Selección de Estrategia para el Desarrollador
El motor ofrecerá soporte nativo para que el desarrollador elija cómo reaccionar ante los cambios de versión a través de la configuración del Orquestador de Runtime:
## Opción A: Agotamiento Natural (Drain / Side-by-Side) - Por Defecto
Las instancias viejas continúan ejecutando el código de su versión original hasta morir pacíficamente. Las nuevas van a la versión más alta.
## Opción B: Parcheo In-line (In-Flight Patching)
Permite bifurcar lógica dentro de un mismo nodo basándose en la versión en vuelo. Se dota al contexto de la firma:

```
ctx.isVersion(versionExpression: string): boolean;// Ejemplo: if (ctx.isVersion('>=2.0.0')) { ... }
```

## Opción C: Migración de Estado Explícita (State Upgrading)
Si el cambio es drástico, se permite inyectar una función puente (Upgrader) para transformar el estado deshidratado antes de relanzar el bucle en la versión nueva:

```typescript
interface WorkflowUpgrader<TStateV1, TStateV2> {
  fromVersion: string;
  toVersion: string;
  migrate: (snapshot: { state: TStateV1; suspendedAtNodeId: string }) => { 
    state: TStateV2; 
    suspendedAtNodeId: string; 
  };
}
```

