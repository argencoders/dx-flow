import { DeepReadonly } from "../core/deep-readonly.js";
import { createRuntimeContext } from "./context.js";
import {
  NodeHandler,
  NodeHandlersMap,
  NodeHandlerResult,
} from "./node-handler.js";
import { defaultNodeHandlers } from "./node-handlers.js";

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
 * Opciones para ejecutar un workflow en runtime.
 */
export interface ExecuteWorkflowOptions<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
> {
  graph: {
    readonly id: string;
    readonly nodes: Record<string, any>;
  };
  initialState: TState;
  services: TServices;
  onMutation?: (mutationKey: keyof TMutations, payload: any) => void;
  reducer?: (
    state: TState,
    mutationKey: keyof TMutations,
    payload: any,
  ) => TState;
  startNodeId?: TNodesList;
  handlers?: NodeHandlersMap<TState, TServices, TNodesList, TMutations>;
  delayFn?: (ms: number) => Promise<void>;
  signalPayload?: any;
}

/**
 * Orquestador principal en runtime con soporte para Ejecución Durable (Suspensión y Reanudación).
 */
export async function executeWorkflow<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
>({
  graph,
  initialState,
  services,
  onMutation,
  reducer,
  startNodeId,
  handlers,
  delayFn,
  signalPayload,
}: ExecuteWorkflowOptions<
  TState,
  TServices,
  TNodesList,
  TMutations
>): Promise<WorkflowExecutionResult<TState, TNodesList>> {
  let currentState: TState = initialState;
  let currentNodeId: TNodesList | undefined =
    startNodeId ?? ("start" as TNodesList);

  const history: Array<ExecutionStepRecord<TNodesList>> = [];
  const activeHandlers = (handlers ?? defaultNodeHandlers) as NodeHandlersMap<
    TState,
    TServices,
    TNodesList,
    TMutations
  >;

  while (currentNodeId) {
    const node: any = graph.nodes[currentNodeId];
    if (!node) {
      throw new Error(
        `❌ ERROR: El nodo '${String(
          currentNodeId,
        )}' no existe en la topología del grafo '${graph.id}'.`,
      );
    }

    const handler:
      | NodeHandler<TState, TServices, TNodesList, TMutations>
      | undefined = activeHandlers[node.type];
    if (typeof handler !== "function") {
      throw new Error(
        `❌ ERROR: No existe un handler registrado para procesar el tipo de nodo '${node.type}'.`,
      );
    }

    const nodeToExecute =
      signalPayload !== undefined
        ? { ...node, signalPayload }
        : node;

    const runtimeContext = createRuntimeContext<
      TState,
      TNodesList,
      TMutations
    >((key, payload) => {
      onMutation?.(key, payload);
      if (typeof reducer === "function") {
        currentState = reducer(currentState, key, payload);
      }
    });

    const contextFull = {
      ...runtimeContext,
      services,
    };

    const result: NodeHandlerResult<TNodesList> = await handler({
      node: nodeToExecute,
      state: currentState as DeepReadonly<TState>,
      context: contextFull,
      delayFn,
    });

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
      });
      return {
        status: "COMPLETED",
        workflowId: graph.id,
        endStatus: result.status,
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
 * Helper para reanudar un workflow suspendido desde su punto de congelamiento.
 */
export async function resumeWorkflow<
  TState,
  TServices,
  TNodesList extends string,
  TMutations,
>(
  suspendedResult: Extract<
    WorkflowExecutionResult<TState, TNodesList>,
    { status: "SUSPENDED" }
  >,
  options: Omit<
    ExecuteWorkflowOptions<TState, TServices, TNodesList, TMutations>,
    "initialState" | "startNodeId"
  >,
): Promise<WorkflowExecutionResult<TState, TNodesList>> {
  const resumeNodeId =
    suspendedResult.targetOnResume ?? suspendedResult.suspendedAtNodeId;

  return executeWorkflow<TState, TServices, TNodesList, TMutations>({
    ...options,
    initialState: suspendedResult.finalState as TState,
    startNodeId: resumeNodeId,
  });
}
