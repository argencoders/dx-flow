# Sprint 4: Infraestructura, Persistencia & Ingestión Reactiva de Eventos (Mosquitto & APIs)

---

## 1. Visión General

El objetivo del Sprint 4 es dotar al motor de workflows (desarrollado en el Sprint 3) de capacidades de **persistencia de instancias**, **reanudación asíncrona reactiva mediante eventos MQTT (Mosquitto)** e **integración con APIs externas (Webhooks & REST Gateway)**.

---

## 2. Componentes Arquitectónicos

### 💾 2.1. Persistencia e Hidratación de Instancias (`WorkflowInstanceStore`)

Las instancias de workflow deben poder congelarse en puntos de espera (`delay`, `event`, etc.), persistir su estado y reanudarse tras reinicios de servicios.

- **Contrato de Interfaz (`src/infrastructure/store/workflow-store.ts`):**
  ```ts
  export interface WorkflowInstanceSnapshot<TState> {
    readonly instanceId: string;
    readonly workflowId: string;
    readonly currentNodeId: string;
    readonly status: "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";
    readonly state: TState;
    readonly history: Array<{
      readonly timestamp: number;
      readonly nodeId: string;
      readonly action?: string;
    }>;
  }

  export interface WorkflowInstanceStore<TState> {
    save(snapshot: WorkflowInstanceSnapshot<TState>): Promise<void>;
    getById(instanceId: string): Promise<WorkflowInstanceSnapshot<TState> | null>;
    updateStateAndNode(
      instanceId: string,
      newState: TState,
      nextNodeId: string,
      status?: "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED"
    ): Promise<void>;
  }
  ```

- **Adaptadores:**
  - `InMemoryWorkflowStore`: Para pruebas unitarias y entornos de desarrollo.
  - `RedisWorkflowStore` / `PostgresWorkflowStore`: Para producción con locks distribuidos.

---

### 📡 2.2. Ingestión Reactiva con Mosquitto / MQTT (`MqttWorkflowIngress`)

- **Extensión de Fisonomía de Nodo (`type: "event"`):**
  Mediante *Declaration Merging* en `NodeDefinitions`, incorporaremos la capacidad de pausar un flujo esperando un evento MQTT específico:
  ```ts
  declare module "./validator.js" {
    interface NodeDefinitions<TState, TRegistry, TNodesList extends string, TMutations> {
      event: {
        type: "event";
        topic: string; // Ej: "dispositivos/+/telemetria" o "pagos/confirmaciones"
        timeoutMs?: number;
        onSuccess: TNodesList;
        onTimeout?: TNodesList;
      };
    }
  }
  ```

- **Adaptador Mosquitto (`src/infrastructure/mqtt/mosquitto-bridge.ts`):**
  - Cliente de suscripción MQTT conectado a la instancia de Mosquitto.
  - Al recibir un mensaje MQTT:
    1. Extrae la clave de correlación (`instanceId`) del payload o header del mensaje.
    2. Recupera la instancia congelada desde `WorkflowInstanceStore`.
    3. Aplica las mutaciones de estado correspondientes (`ctx.mutate(...)`).
    4. Reanuda la ejecución del motor determinísticamente hacia `onSuccess`.

---

### 🌐 2.3. Integración con APIs y Webhooks (`ApiIngressGateway`)

- **Outbound (Llamadas Salientes):** Consumo seguro de servicios externos e IoC mediante el mapa `TRegistry` provisto en la creación del workflow.
- **Inbound (Llamadas Entrantes / Webhooks):**
  - Endpoint REST (`POST /api/v1/workflows/:instanceId/resume`) para reanudar instancias desde pasarelas de pago u otros microservicios.

---

## 3. Checklist de Ejecución (Sprint 4)

- [ ] **Paso 4.1:** Definición del contrato `WorkflowInstanceStore` e implementación de `InMemoryWorkflowStore`.
- [ ] **Paso 4.2:** Implementación del manejador atómico para el nuevo nodo `event` (`src/workflow/node-event.ts`).
- [ ] **Paso 4.3:** Desarrollo del puente de ingestión MQTT con Mosquitto (`src/infrastructure/mqtt/mosquitto-bridge.ts`).
- [ ] **Paso 4.4:** Desarrollo de los adaptadores de entrada HTTP REST / Webhooks (`src/infrastructure/api/webhook-gateway.ts`).
- [ ] **Paso 4.5:** Pruebas de integración end-to-end simulando un flujo completo con Mosquitto, almacenamiento y reanudación asíncrona.
