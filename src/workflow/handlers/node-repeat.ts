import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";
import { nodeSequenceHandler } from "./node-sequence.js";

/**
 * Estrategia de ejecución para nodos de tipo 'repeat'.
 * - Soporta tanto 'target' (clave de nodo registrada) como 'steps' (arreglo de pasos inline puros).
 * - Evalúa la condición de parada 'until(state)' y/o el conteo de iteraciones 'count'.
 * - Si se definen 'steps' inline, ejecuta ordenadamente la secuencia en cada ciclo actualizando el estado en tiempo real.
 * - Transiciona a 'onSuccess' al cumplirse la condición de salida o agotar iteraciones.
 */
export const nodeRepeatHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
  context,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.steps) && typeof node?.target !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'repeat' debe especificar 'steps' (arreglo inline) o 'target' (clave de nodo).`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'repeat' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  // Modo A: Pasos Inline (steps: Array<InlineStep>)
  if (Array.isArray(node.steps)) {
    let iterations = 0;
    let currentState = state;

    const stepContext = {
      ...context,
      mutate: (patch: any) => {
        currentState = { ...currentState, ...patch };
        context.mutate(patch);
      },
    };

    while (true) {
      // 1. Evaluación de 'until' al inicio del ciclo
      if (typeof node.until === "function" && node.until(currentState)) {
        return {
          type: "NEXT",
          target: node.onSuccess,
        };
      }

      // 2. Evaluación de 'count'
      if (node.count !== undefined) {
        const maxCount =
          typeof node.count === "function"
            ? node.count(currentState)
            : node.count;
        if (typeof maxCount === "number" && iterations >= maxCount) {
          return {
            type: "NEXT",
            target: node.onSuccess,
          };
        }
      }

      iterations++;

      // 3. Ejecutar ciclo de pasos inline usando el handler de secuencias
      const seqResult = await nodeSequenceHandler({
        node: {
          id: node.id,
          steps: node.steps,
          onSuccess: "__REPEAT_STEP_DONE__",
        },
        state: currentState,
        context: stepContext,
        delayFn,
      });

      if (seqResult.type === "SUSPEND") {
        return seqResult;
      }

      if (
        seqResult.type === "NEXT" &&
        seqResult.target !== "__REPEAT_STEP_DONE__"
      ) {
        // Desvío provocado por onError en un paso inline
        return seqResult;
      }

      if (seqResult.type === "END") {
        return seqResult;
      }
    }
  }

  // Modo B: Referencia por 'target' (Clave de nodo registrada)
  if (typeof node.until === "function" && node.until(state)) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  if (node.count !== undefined) {
    const maxCount =
      typeof node.count === "function" ? node.count(state) : node.count;

    if (typeof maxCount === "number" && maxCount <= 0) {
      return {
        type: "NEXT",
        target: node.onSuccess,
      };
    }
  }

  return {
    type: "NEXT",
    target: node.target,
  };
};
