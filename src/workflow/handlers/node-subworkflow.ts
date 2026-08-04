import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";

/**
 * Handler runtime para nodos de tipo 'subworkflow'.
 * - Ejecuta un grafo hijo de forma aislada y desacoplada.
 * - Mapea el estado del padre al estado inicial del hijo vía 'input'.
 * - Propaga las mutaciones de salida del hijo hacia el padre vía 'output'.
 * - Permite mapear errores de terminación del hijo vía 'onError'.
 * - Registra la compensación Saga si el nodo padre define 'compensate'.
 * - Transmite suspensiones durables si el sub-workflow suspende.
 */
export const nodeSubworkflowHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
  context,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (!node.workflow) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'subworkflow' debe especificar la propiedad 'workflow'.`,
    );
  }

  if (typeof node.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'subworkflow' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  const childGraph =
    typeof node.workflow === "function"
      ? node.workflow(state, context.services)
      : node.workflow;

  if (!childGraph || typeof childGraph.nodes !== "object") {
    throw new Error(
      `❌ ERROR: El sub-workflow provisto no es un WorkflowGraph válido.`,
    );
  }

  const subInitialState =
    typeof node.input === "function" ? node.input(state) : state;

  const { executeWorkflow } = await import("../core/engine.js");

  const subResult = await executeWorkflow({
    graph: childGraph,
    initialState: subInitialState,
    services: context.services,
    delayFn,
    signalPayload: context.signalPayload,
  });

  if (subResult.status === "SUSPENDED") {
    return {
      type: "SUSPEND",
      eventName: subResult.eventName,
      targetOnResume: subResult.targetOnResume,
    };
  }

  if (subResult.status === "COMPLETED") {
    if (
      subResult.endResult === "error" ||
      (node.onError && subResult.endStatus in node.onError) ||
      (node.onError && "default" in node.onError)
    ) {
      const errorTarget =
        node.onError?.[subResult.endStatus] ?? node.onError?.["default"];
      if (typeof errorTarget === "string") {
        return {
          type: "NEXT",
          target: errorTarget,
        };
      }
    }

    if (typeof node.output === "function") {
      await node.output(context, subResult.finalState, subResult);
    }

    if (
      typeof node.compensate === "function" &&
      typeof context.registerCompensation === "function"
    ) {
      context.registerCompensation((st, ctx) => node.compensate(st, ctx));
    }

    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  throw new Error(
    `❌ ERROR: El sub-workflow finalizó con un resultado no reconocido.`,
  );
};
