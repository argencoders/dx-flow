import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";
import { executeActionWithRetry } from "./node-action.js";

/**
 * Estrategia de ejecución para nodos de tipo 'sequence'.
 * - Valida la estructura declarativa de 'steps' y 'onSuccess'.
 * - Si 'steps' es un array vacío, transiciona inmediatamente a 'onSuccess'.
 * - Soporta exclusivamente pasos inline puros (funciones shorthand, objetos de tipo action, delay, choose).
 * - Mantiene y propaga el estado actualizado en tiempo real entre pasos inline de la secuencia.
 * - Para acciones inline, onSuccess es implícito (continúa al siguiente paso).
 * - Para choose inline sin otherwise, si no hay coincidencia realiza fallthrough al siguiente paso.
 */
export const nodeSequenceHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
  context,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.steps)) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'sequence' debe definir una lista 'steps' de tipo array.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'sequence' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  if (node.steps.length === 0) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  let currentState = state;
  const stepContext = {
    ...context,
    mutate: (patch: any) => {
      currentState = { ...currentState, ...patch };
      context.mutate(patch);
    },
  };

  for (let i = 0; i < node.steps.length; i++) {
    const step = node.steps[i];

    if (typeof step === "string") {
      throw new Error(
        `❌ ERROR: El paso '${step}' en 'sequence' es un string key. Los pasos de 'sequence' deben ser nodos inline puros.`,
      );
    }

    if (typeof step === "function") {
      const result = await step(currentState, stepContext);
      if (
        typeof result === "object" &&
        result?.__type_navigation__ === "SUSPEND_NODE"
      ) {
        return {
          type: "SUSPEND",
          eventName: result.eventName,
          targetOnResume: node.id ? `${node.id}#step-${i}` : undefined,
        };
      }
      if (typeof result === "string") {
        throw new Error(
          `❌ ERROR: El paso inline de función retornó un código de error '${result}' sin un diccionario 'onError'. Usar formato { type: "action", action: ..., onError: ... }.`,
        );
      }
      continue;
    }

    if (typeof step === "object" && step !== null) {
      if (step.type === "action" || typeof step.action === "function") {
        const result = await executeActionWithRetry(
          () => step.action(currentState, stepContext),
          step.retry,
          delayFn,
        );
        if (
          typeof result === "object" &&
          result?.__type_navigation__ === "SUSPEND_NODE"
        ) {
          return {
            type: "SUSPEND",
            eventName: result.eventName,
            targetOnResume: node.id ? `${node.id}#step-${i}` : undefined,
          };
        }
        if (typeof result === "string") {
          const errorTarget = step.onError?.[result];
          if (typeof errorTarget !== "string") {
            throw new Error(
              `❌ ERROR: El código de error '${result}' devuelto por el paso inline de 'action' no está mapeado en 'onError'.`,
            );
          }
          return {
            type: "NEXT",
            target: errorTarget,
          };
        }
        if (
          (result === undefined || result === null) &&
          typeof step.compensate === "function" &&
          typeof context.registerCompensation === "function"
        ) {
          context.registerCompensation((st, ctx) => step.compensate(st, ctx));
        }
        continue;
      }

      if (step.type === "delay") {
        const ms = step.durationMs;
        if (typeof ms !== "number") {
          throw new Error(
            `❌ ERROR: El paso inline 'delay' debe especificar 'durationMs' numérico.`,
          );
        }
        if (typeof delayFn === "function") {
          await delayFn(ms);
        } else {
          await new Promise((resolve) => setTimeout(resolve, ms));
        }
        continue;
      }

      if (step.type === "choose") {
        if (!Array.isArray(step.choices)) {
          throw new Error(
            `❌ ERROR: El paso inline 'choose' debe especificar la lista 'choices'.`,
          );
        }
        const matched = step.choices.find((c: any) => c.condition(currentState));
        if (matched) {
          return {
            type: "NEXT",
            target: matched.nextNode,
          };
        }
        if (typeof step.otherwise === "string") {
          return {
            type: "NEXT",
            target: step.otherwise,
          };
        }
        // Fallthrough implícito al siguiente paso inline
        continue;
      }
    }
  }

  return {
    type: "NEXT",
    target: node.onSuccess,
  };
};
