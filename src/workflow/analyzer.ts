import { WorkflowGraph, resolveStartNodeId } from "./core/factory.js";

/**
 * Opciones para la auditoría de topología del grafo.
 */
export interface TopologyAnalysisOptions<TNodesList extends string = string> {
  startNodeId?: TNodesList;
}

/**
 * Resultado completo del análisis de topología del grafo.
 */
export interface TopologyAnalysisResult<TNodesList extends string = string> {
  isValid: boolean;
  startNodeId: TNodesList | undefined;
  nodesCount: number;
  reachableNodes: TNodesList[];
  unreachableNodes: TNodesList[];
  isolatedNodes: TNodesList[];
  deadEndNodes: TNodesList[];
  unclosedCycles: TNodesList[][];
  terminalNodes: TNodesList[];
  suspensionNodes: TNodesList[];
  warnings: string[];
  errors: string[];
}

/**
 * Extrae todas las claves de nodos destino declarados como aristas salientes desde un nodo determinado.
 */
export function extractOutgoingEdges(node: any): string[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  // Los nodos terminales 'end' no tienen aristas salientes
  if (node.type === "end") {
    return [];
  }

  const targetsSet: Set<string> = new Set();

  // 1. onSuccess directo o onTimeout directo
  if (typeof node.onSuccess === "string" && node.onSuccess.trim() !== "") {
    targetsSet.add(node.onSuccess);
  }
  if (typeof node.onTimeout === "string" && node.onTimeout.trim() !== "") {
    targetsSet.add(node.onTimeout);
  }

  // 2. Transiciones de error en onError
  if (node.onError && typeof node.onError === "object") {
    for (const val of Object.values(node.onError)) {
      if (typeof val === "string" && val.trim() !== "") {
        targetsSet.add(val);
      }
    }
  }

  // 3. Ramificaciones en nodos choose
  if (node.type === "choose" || Array.isArray(node.choices)) {
    if (Array.isArray(node.choices)) {
      for (const choice of node.choices) {
        if (choice) {
          if (typeof choice.nextNode === "string" && choice.nextNode.trim() !== "") {
            targetsSet.add(choice.nextNode);
          }
          if (typeof choice.target === "string" && choice.target.trim() !== "") {
            targetsSet.add(choice.target);
          }
        }
      }
    }
    if (typeof node.otherwise === "string" && node.otherwise.trim() !== "") {
      targetsSet.add(node.otherwise);
    }
  }

  // 4. Repeticiones en nodos repeat
  if (node.type === "repeat") {
    if (typeof node.target === "string" && node.target.trim() !== "") {
      targetsSet.add(node.target);
    }
  }

  // 5. Ramas registradas en nodos parallel
  if (node.type === "parallel" && Array.isArray(node.branches)) {
    for (const branch of node.branches) {
      if (typeof branch === "string" && branch.trim() !== "") {
        targetsSet.add(branch);
      }
    }
  }

  // 6. Propiedades genéricas target o otherwise si existen en nodos personalizados
  if (typeof node.target === "string" && node.target.trim() !== "" && node.type !== "repeat") {
    targetsSet.add(node.target);
  }
  if (typeof node.otherwise === "string" && node.otherwise.trim() !== "" && node.type !== "choose") {
    targetsSet.add(node.otherwise);
  }

  return Array.from(targetsSet);
}

/**
 * Realiza el análisis estático de topología del grafo de workflow.
 */
export function analyzeTopology<
  TState = any,
  TServices = any,
  TNodesList extends string = string,
>(
  graph: WorkflowGraph<TState, TServices, TNodesList>,
  options?: TopologyAnalysisOptions<TNodesList>,
): TopologyAnalysisResult<TNodesList> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const rawNodes = graph?.nodes as Record<string, any> | undefined;
  const allNodeIds = (rawNodes ? Object.keys(rawNodes) : []) as TNodesList[];
  const nodesCount = allNodeIds.length;

  if (!rawNodes || nodesCount === 0) {
    errors.push("❌ ERROR: El grafo de workflow no contiene ningún nodo registrado.");
    return {
      isValid: false,
      startNodeId: undefined,
      nodesCount: 0,
      reachableNodes: [],
      unreachableNodes: [],
      isolatedNodes: [],
      deadEndNodes: [],
      unclosedCycles: [],
      terminalNodes: [],
      suspensionNodes: [],
      warnings: [],
      errors,
    };
  }

  // Resolución determinista del nodo inicial
  const startNodeId: TNodesList | undefined = resolveStartNodeId(
    rawNodes,
    options?.startNodeId,
  );

  if (!startNodeId || !rawNodes[startNodeId]) {
    errors.push(`❌ ERROR: El nodo de inicio especificado o inferido '${String(startNodeId)}' no existe en el grafo.`);
    return {
      isValid: false,
      startNodeId: undefined,
      nodesCount,
      reachableNodes: [],
      unreachableNodes: allNodeIds,
      isolatedNodes: [],
      deadEndNodes: [],
      unclosedCycles: [],
      terminalNodes: [],
      suspensionNodes: [],
      warnings,
      errors,
    };
  }

  // Construcción de mapas de adyacencia directa e inversa
  const outgoingMap: Map<TNodesList, Set<TNodesList>> = new Map();
  const incomingMap: Map<TNodesList, Set<TNodesList>> = new Map();

  for (const nodeId of allNodeIds) {
    outgoingMap.set(nodeId, new Set());
    if (!incomingMap.has(nodeId)) {
      incomingMap.set(nodeId, new Set());
    }
  }

  for (const nodeId of allNodeIds) {
    const node = rawNodes[nodeId];
    const targets = extractOutgoingEdges(node) as TNodesList[];

    for (const target of targets) {
      if (!rawNodes[target]) {
        errors.push(
          `❌ ERROR: El nodo '${String(nodeId)}' referencia un destino inexistente '${String(target)}'.`,
        );
      } else {
        outgoingMap.get(nodeId)!.add(target);
        if (!incomingMap.has(target)) {
          incomingMap.set(target, new Set());
        }
        incomingMap.get(target)!.add(nodeId);
      }
    }
  }

  // Auditoría de Alcanzabilidad BFS desde el nodo inicial
  const reachableSet: Set<TNodesList> = new Set();
  const queue: TNodesList[] = [startNodeId];
  reachableSet.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const targets = outgoingMap.get(current) ?? new Set();
    for (const target of targets) {
      if (!reachableSet.has(target)) {
        reachableSet.add(target);
        queue.push(target);
      }
    }
  }

  const reachableNodes = Array.from(reachableSet);
  const unreachableNodes = allNodeIds.filter((id) => !reachableSet.has(id));

  for (const unreachableId of unreachableNodes) {
    warnings.push(
      `⚠️ ADVERTENCIA: El nodo '${String(unreachableId)}' es inalcanzable desde el nodo de inicio '${String(startNodeId)}'.`,
    );
  }

  // Detección de Nodos Aislados (sin ninguna arista entrante, excepto el start Node)
  const isolatedNodes = allNodeIds.filter(
    (id) => id !== startNodeId && (!incomingMap.has(id) || incomingMap.get(id)!.size === 0),
  );

  for (const isolatedId of isolatedNodes) {
    warnings.push(
      `⚠️ ADVERTENCIA: El nodo '${String(isolatedId)}' está aislado (no posee aristas entrantes).`,
    );
  }

  // Clasificación de Nodos Terminales y de Suspensión
  const terminalNodes = allNodeIds.filter((id) => rawNodes[id]?.type === "end");
  const suspensionNodes = allNodeIds.filter(
    (id) => rawNodes[id]?.type === "delay" || rawNodes[id]?.type === "subworkflow",
  );

  // Detección de Callejones sin Salida (Nodos alcanzables que no son 'end' y tienen 0 salientes)
  const deadEndNodes = reachableNodes.filter((id) => {
    const node = rawNodes[id];
    if (node?.type === "end") return false;
    const outDegree = outgoingMap.get(id)?.size ?? 0;
    return outDegree === 0;
  });

  for (const deadEndId of deadEndNodes) {
    const nodeType = rawNodes[deadEndId]?.type ?? "desconocido";
    errors.push(
      `❌ ERROR: El nodo '${String(deadEndId)}' (tipo '${nodeType}') es un callejón sin salida y no es de tipo 'end'.`,
    );
  }

  // Detección de Ciclos Infinitos sin Salida (BFS Inverso desde nodos terminales y de suspensión)
  const canEscapeSet: Set<TNodesList> = new Set();
  const escapeQueue: TNodesList[] = [];

  for (const termId of terminalNodes) {
    if (reachableSet.has(termId)) {
      canEscapeSet.add(termId);
      escapeQueue.push(termId);
    }
  }

  for (const suspId of suspensionNodes) {
    if (reachableSet.has(suspId)) {
      canEscapeSet.add(suspId);
      escapeQueue.push(suspId);
    }
  }

  while (escapeQueue.length > 0) {
    const current = escapeQueue.shift()!;
    const incoming = incomingMap.get(current) ?? new Set();
    for (const pred of incoming) {
      if (reachableSet.has(pred) && !canEscapeSet.has(pred)) {
        canEscapeSet.add(pred);
        escapeQueue.push(pred);
      }
    }
  }

  // Identificar nodos alcanzables que NO pueden escapar
  const stuckNodes = reachableNodes.filter((id) => !canEscapeSet.has(id));
  const unclosedCycles: TNodesList[][] = [];

  if (stuckNodes.length > 0) {
    // Agrupar nodos atrapados en ciclos utilizando detección de ciclos por DFS
    const visitedInCycle: Set<TNodesList> = new Set();

    for (const stuckId of stuckNodes) {
      if (visitedInCycle.has(stuckId)) continue;

      const path: TNodesList[] = [];
      const inPath: Set<TNodesList> = new Set();

      const dfsCycle = (curr: TNodesList): boolean => {
        path.push(curr);
        inPath.add(curr);
        visitedInCycle.add(curr);

        const targets = outgoingMap.get(curr) ?? new Set();
        for (const nextId of targets) {
          if (!stuckNodes.includes(nextId)) continue;

          if (inPath.has(nextId)) {
            // Ciclo encontrado
            const cycleStartIndex = path.indexOf(nextId);
            const cyclePath = path.slice(cycleStartIndex);
            unclosedCycles.push(cyclePath);
            return true;
          }

          if (!visitedInCycle.has(nextId)) {
            if (dfsCycle(nextId)) return true;
          }
        }

        inPath.delete(curr);
        path.pop();
        return false;
      };

      dfsCycle(stuckId);
    }

    for (const cycle of unclosedCycles) {
      errors.push(
        `❌ ERROR: Se detectó un ciclo infinito sin salida que involucra a los nodos: ${cycle.map((n) => `'${String(n)}'`).join(" -> ")}.`,
      );
    }

    if (unclosedCycles.length === 0 && stuckNodes.length > 0) {
      errors.push(
        `❌ ERROR: Nodos atrapados en trayectorias sin escape a nodos terminales: ${stuckNodes.map((n) => `'${String(n)}'`).join(", ")}.`,
      );
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    startNodeId,
    nodesCount,
    reachableNodes,
    unreachableNodes,
    isolatedNodes,
    deadEndNodes,
    unclosedCycles,
    terminalNodes,
    suspensionNodes,
    warnings,
    errors,
  };
}
