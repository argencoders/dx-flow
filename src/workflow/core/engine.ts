import { DeepReadonly } from "../../core/deep-readonly.types.js";
import { createRuntimeContext } from "./context.js";
import { WorkflowGraph, resolveStartNodeId } from "./factory.js";
import {
  NodeHandler,
  NodeHandlersMap,
  NodeHandlerResult,
} from "./node-handler.js";
import { defaultNodeHandlers } from "../handlers/node-handlers.js";

/**
 * Registro de un paso individual ejecutado durante la trayectoria del workflow.
 */
export interface ExecutionStepRecord<TNodesList extends string> {
  nodeId: TNodesList;
  nodeType: string;
  timestamp: number;
  resultType: "NEXT" | "END" | "SUSPEND";
  target?: TNodesList;
  status?: string;
  endResult?: "success" | "error" | "compensate" | "terminate";
  eventName?: string;
}

/**
 * Resultado devuelto por la ejecución del motor de workflow.
 */
export type WorkflowExecutionResult<
  TState,
  TNodesList extends string,
> =
  | {
      status: "COMPLETED";
      workflowId: string;
      endStatus: string;
      endResult?: "success" | "error" | "compensate" | "terminate";
      finalState: DeepReadonly<TState>;
      history: Array<ExecutionStepRecord<TNodesList>>;
    }
  | {
      status: "SUSPENDED";
      workflowId: string;
      suspendedAtNodeId: TNodesList;
      targetOnResume?: TNodesList;
      eventName?: string;
      finalState: DeepReadonly<TState>;
      history: Array<ExecutionStepRecord<TNodesList>>;
    };

/**
 * Opciones para ejecutar un workflow en runtime con inferencia automática desde WorkflowGraph.
 */
export interface ExecuteWorkflowOptions<
  TState,
  TServices,
  TNodesList extends string,
> {
  graph: WorkflowGraph<TState, TServices, TNodesList>;
  initialState: TState;
  services: TServices;
  onMutation?: (
    patch: Partial<TState>,
    newState: DeepReadonly<TState>,
  ) => void;
  startNodeId?: TNodesList;
  handlers?: NodeHandlersMap<TState, TServices, TNodesList>;
  delayFn?: (ms: number) => Promise<void>;
  signalPayload?: any;
}

/**
 * Orquestador principal en runtime con inferencia automática de TState y TServices desde el grafo.
 */
export async function executeWorkflow<
  TState,
  TServices,
  TNodesList extends string,
>({
  graph,
  initialState,
  services,
  onMutation,
  startNodeId,
  handlers,
  delayFn,
  signalPayload,
}: ExecuteWorkflowOptions<TState, TServices, TNodesList>): Promise<WorkflowExecutionResult<TState, TNodesList>> {
  let currentState: TState = initialState;
  let currentNodeId: TNodesList | undefined = resolveStartNodeId(
    graph.nodes,
    startNodeId,
  );

  const history: Array<ExecutionStepRecord<TNodesList>> = [];
  const compensationStack: Array<(state: any, context: any) => Promise<void> | void> = [];
  const activeHandlers = (handlers ?? defaultNodeHandlers) as NodeHandlersMap<
    TState,
    TServices,
    TNodesList
  >;

  while (currentNodeId) {
    const node: any = graph.nodes[currentNodeId];
    if (!node) {
      const errContext = createRuntimeContext<TState, TNodesList>(
        (patch) => {
          currentState = { ...currentState, ...patch };
          onMutation?.(patch, currentState as DeepReadonly<TState>);
        },
        compensationStack,
        () => currentState as DeepReadonly<TState>,
        () => services,
      );
      await errContext.compensate?.();
      throw new Error(
        `❌ ERROR: El nodo '${String(
          currentNodeId,
        )}' no existe en la topología del grafo '${graph.id}'.`,
      );
    }

    const handler:
      | NodeHandler<TState, TServices, TNodesList>
      | undefined = activeHandlers[node.type];
    if (typeof handler !== "function") {
      const errContext = createRuntimeContext<TState, TNodesList>(
        (patch) => {
          currentState = { ...currentState, ...patch };
          onMutation?.(patch, currentState as DeepReadonly<TState>);
        },
        compensationStack,
        () => currentState as DeepReadonly<TState>,
        () => services,
      );
      await errContext.compensate?.();
      throw new Error(
        `❌ ERROR: No existe un handler registrado para procesar el tipo de nodo '${node.type}'.`,
      );
    }

    const nodeToExecute =
      signalPayload !== undefined
        ? { ...node, signalPayload }
        : node;

    const runtimeContext = createRuntimeContext<TState, TNodesList>(
      (patch) => {
        currentState = { ...currentState, ...patch };
        onMutation?.(patch, currentState as DeepReadonly<TState>);
      },
      compensationStack,
      () => currentState as DeepReadonly<TState>,
      () => services,
    );

    const contextFull = {
      ...runtimeContext,
      services,
      signalPayload,
    };

    let result: NodeHandlerResult<TNodesList>;
    try {
      result = await handler({
        node: nodeToExecute,
        state: currentState as DeepReadonly<TState>,
        context: contextFull,
        delayFn,
      });
    } catch (error) {
      await runtimeContext.compensate?.();
      throw error;
    }

    const timestamp = Date.now();

    if (result.type === "NEXT") {
      history.push({
        nodeId: currentNodeId,
        nodeType: node.type,
        timestamp,
        resultType: "NEXT",
        target: result.target,
      });
      currentNodeId = result.target;
    } else if (result.type === "END") {
      history.push({
        nodeId: currentNodeId,
        nodeType: node.type,
        timestamp,
        resultType: "END",
        status: result.status,
        endResult: result.result,
      });
      return {
        status: "COMPLETED",
        workflowId: graph.id,
        endStatus: result.status,
        endResult: result.result,
        finalState: currentState as DeepReadonly<TState>,
        history,
      };
    } else if (result.type === "SUSPEND") {
      history.push({
        nodeId: currentNodeId,
        nodeType: node.type,
        timestamp,
        resultType: "SUSPEND",
        target: result.targetOnResume,
        eventName: result.eventName,
      });
      return {
        status: "SUSPENDED",
        workflowId: graph.id,
        suspendedAtNodeId: currentNodeId,
        targetOnResume: result.targetOnResume,
        eventName: result.eventName,
        finalState: currentState as DeepReadonly<TState>,
        history,
      };
    }
  }

  throw new Error(
    `❌ ERROR: El workflow finalizó su bucle sin alcanzar un nodo de tipo 'end' o 'suspend'.`,
  );
}

/**
 * Helper para reanudar un workflow suspendido deshidratado desde su punto de congelamiento.
 */
export async function resumeWorkflow<
  TState,
  TServices,
  TNodesList extends string,
>(
  suspendedResult: Extract<
    WorkflowExecutionResult<TState, TNodesList>,
    { status: "SUSPENDED" }
  >,
  options: Omit<
    ExecuteWorkflowOptions<TState, TServices, TNodesList>,
    "initialState" | "startNodeId"
  >,
): Promise<WorkflowExecutionResult<TState, TNodesList>> {
  const resumeNodeId =
    suspendedResult.targetOnResume ?? suspendedResult.suspendedAtNodeId;

  return executeWorkflow<TState, TServices, TNodesList>({
    ...options,
    initialState: suspendedResult.finalState as TState,
    startNodeId: resumeNodeId,
  });
}
