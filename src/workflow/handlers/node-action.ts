import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";
import { RetryPolicy } from "../core/validator.js";

/**
 * Ejecuta una función de acción respetando la política de reintentos RetryPolicy con backoff exponencial.
 */
export async function executeActionWithRetry(
  actionFn: () => Promise<any> | any,
  retryPolicy?: RetryPolicy,
  delayFn?: (ms: number) => Promise<void>,
): Promise<any> {
  if (!retryPolicy) {
    return await actionFn();
  }

  const maxAttempts = retryPolicy.maxAttempts;
  const initialIntervalMs = retryPolicy.initialIntervalMs;
  const backoffCoef = retryPolicy.backoffCoefficient ?? 2;
  const maxIntervalMs = retryPolicy.maxIntervalMs;
  const jitter = retryPolicy.jitter ?? false;
  const retryableErrors = retryPolicy.retryableErrors;

  const sleep = delayFn ?? ((ms: number) => new Promise((res) => setTimeout(res, ms)));

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const result = await actionFn();

      if (
        typeof result === "string" &&
        Array.isArray(retryableErrors) &&
        retryableErrors.includes(result) &&
        attempt < maxAttempts
      ) {
        let delay = initialIntervalMs * Math.pow(backoffCoef, attempt - 1);
        if (maxIntervalMs !== undefined) {
          delay = Math.min(delay, maxIntervalMs);
        }
        if (jitter) {
          delay = Math.round(delay * (0.8 + Math.random() * 0.4));
        }
        await sleep(delay);
        continue;
      }

      return result;
    } catch (err: any) {
      if (attempt >= maxAttempts) {
        throw err;
      }

      if (Array.isArray(retryableErrors) && retryableErrors.length > 0) {
        const errMsg = err?.message ?? String(err);
        const matches = retryableErrors.some((e) => errMsg.includes(e) || err?.name === e);
        if (!matches) {
          throw err;
        }
      }

      let delay = initialIntervalMs * Math.pow(backoffCoef, attempt - 1);
      if (maxIntervalMs !== undefined) {
        delay = Math.min(delay, maxIntervalMs);
      }
      if (jitter) {
        delay = Math.round(delay * (0.8 + Math.random() * 0.4));
      }
      await sleep(delay);
    }
  }
}

/**
 * Estrategia de ejecución atómica para nodos de tipo 'action'.
 * - Si la función 'action' resuelve sin retornar nada (void / undefined), la ejecución ha sido exitosa
 *   y navega estáticamente hacia 'onSuccess'.
 * - Si la función 'action' invoca 'ctx.suspend(eventName)', congela la ejecución del workflow.
 * - Si la función 'action' retorna una clave de error (string), se busca determinísticamente
 *   su mapeo en el diccionario declarativo 'onError'.
 * - Si el nodo cuenta con 'retry' (RetryPolicy), se aplican reintentos automáticos con backoff exponencial.
 */
export const nodeActionHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
  context,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (typeof node?.action !== "function") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'action' no contiene una función 'action' ejecutable.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'action' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  let currentState = state;
  const actionContext = {
    ...context,
    mutate: (patch: any) => {
      currentState = { ...currentState, ...patch };
      context.mutate(patch);
    },
  };

  const result = await executeActionWithRetry(
    () => node.action(currentState, actionContext),
    node.retry,
    delayFn,
  );

  // 1. Éxito: La función retornó void / undefined -> Navegar a onSuccess
  if (result === undefined || result === null) {
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

  // 2. Suspensión Dinámica: La función retornó un resultado de ctx.suspend(...)
  if (
    typeof result === "object" &&
    result?.__type_navigation__ === "SUSPEND_NODE"
  ) {
    return {
      type: "SUSPEND",
      eventName: result.eventName,
    };
  }

  // 3. Error Mapeado: La función retornó una clave de error (string) -> Buscar en onError
  if (typeof result === "string") {
    const errorTarget = node?.onError?.[result];
    if (typeof errorTarget !== "string") {
      throw new Error(
        `❌ ERROR: El código de error '${result}' devuelto por 'action' no está mapeado en 'onError'.`,
      );
    }
    return {
      type: "NEXT",
      target: errorTarget,
    };
  }

  throw new Error(
    `❌ ERROR: La función del nodo 'action' debe devolver void en caso de éxito, ctx.suspend() para pausar, o un string de error manejado en 'onError'.`,
  );
};
