import { NodeHandler, NodeHandlerResult } from "../core/node-handler.js";
import { nodeSequenceHandler } from "./node-sequence.js";

/**
 * Estrategia de ejecución para nodos de tipo 'parallel'.
 * - Valida la estructura de 'branches' y 'onSuccess'.
 * - Si 'branches' está vacío, transiciona a 'onSuccess'.
 * - Soporta ramas por clave de nodo registrada (cadena), funciones shorthand, pasos inline u objetos { type: "sequence", steps: [...] }.
 * - Ejecuta las ramas en paralelo (Promise.all) aislando las mutaciones de cada rama y consolidándolas al converger.
 */
export const nodeParallelHandler: NodeHandler<any, any, any> = async ({
  node,
  state,
  context,
  delayFn,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.branches)) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'parallel' debe definir una lista 'branches' de tipo array.`,
    );
  }

  if (typeof node?.onSuccess !== "string") {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'parallel' debe especificar un nodo de destino 'onSuccess'.`,
    );
  }

  if (node.branches.length === 0) {
    return {
      type: "NEXT",
      target: node.onSuccess,
    };
  }

  const isAllStringKeys = node.branches.every(
    (b: any) => typeof b === "string",
  );

  // Si todas las ramas son cadenas registradas (legado), se mantiene el comportamiento predeterminado
  if (isAllStringKeys) {
    return {
      type: "NEXT",
      target: node.branches[0],
    };
  }

  // Ejecución concurrente de las ramas
  const branchExecutions = node.branches.map(
    async (branch: any, index: number) => {
      // Rama por clave de nodo registrada (cadena)
      if (typeof branch === "string") {
        return {
          type: "NEXT" as const,
          target: branch,
          index,
          branchPatches: {},
        };
      }

      // Pasos Inline (función shorthand, objeto paso, o secuencia { type: "sequence", steps: [...] })
      let branchSteps: any[];
      if (Array.isArray(branch)) {
        branchSteps = branch;
      } else if (
        typeof branch === "object" &&
        branch !== null &&
        branch.type === "sequence" &&
        Array.isArray(branch.steps)
      ) {
        branchSteps = branch.steps;
      } else {
        branchSteps = [branch];
      }

      let localState = state;
      const branchPatches: Record<string, any> = {};

      const branchContext = {
        ...context,
        mutate: (patch: any) => {
          Object.assign(branchPatches, patch);
          localState = { ...localState, ...patch };
        },
      };

      const seqResult = await nodeSequenceHandler({
        node: {
          id: `${node.id}#branch-${index}`,
          steps: branchSteps,
          onSuccess: "__PARALLEL_BRANCH_DONE__",
        },
        state: localState,
        context: branchContext,
        delayFn,
      });

      return {
        ...seqResult,
        branchPatches,
        index,
      };
    },
  );

  const results = await Promise.all(branchExecutions);

  // 1. Verificar si alguna rama retornó SUSPEND
  const suspendResult = results.find((r) => r.type === "SUSPEND");
  if (suspendResult) {
    for (const r of results) {
      if (r.branchPatches && Object.keys(r.branchPatches).length > 0) {
        context.mutate(r.branchPatches);
      }
    }
    return suspendResult;
  }

  // 2. Consolidar mutaciones de todas las ramas al estado central
  for (const r of results) {
    if (r.branchPatches && Object.keys(r.branchPatches).length > 0) {
      context.mutate(r.branchPatches);
    }
  }

  return {
    type: "NEXT",
    target: node.onSuccess,
  };
};
