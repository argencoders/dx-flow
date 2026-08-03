import { NodeHandler, NodeHandlerResult } from "./core/node-handler.js";

/**
 * Estrategia de ejecución atómica para nodos de tipo 'choose'.
 * Evalúa secuencialmente (short-circuit / first-match) el array de condiciones 'choices' contra el estado (DeepReadonly<TState>).
 * - Si una condición retorna 'true', redirige inmediatamente a 'choice.nextNode'.
 * - Si ninguna condición retorna 'true', recurre obligatoriamente a la ruta de escape 'otherwise'.
 *
 * 💡 USO DE 'any': 'nodeChooseHandler' se tipa con NodeHandler<any, any, any, any> para actuar
 * como handler agnóstico predeterminado registrado en el engine, operando sobre cualquier tipo de Estado y Nodos.
 */
export const nodeChooseHandler: NodeHandler<any, any, any, any> = async ({
  node,
  state,
}): Promise<NodeHandlerResult<any>> => {
  if (!Array.isArray(node?.choices)) {
    throw new Error(
      `❌ ERROR: El nodo de tipo 'choose' debe contener un array 'choices'.`,
    );
  }

  const matchedChoice = node.choices.find(
    (choice: { condition: (s: typeof state) => boolean; nextNode: string }) => {
      if (typeof choice?.condition !== "function") {
        throw new Error(
          `❌ ERROR: Cada opción dentro de 'choices' debe definir una función 'condition'.`,
        );
      }
      return choice.condition(state);
    },
  );

  // Si hubo coincidencia (first-match), se navega hacia su nextNode
  if (matchedChoice) {
    if (typeof matchedChoice.nextNode !== "string") {
      throw new Error(
        `❌ ERROR: La opción elegida en 'choose' debe especificar un 'nextNode' válido de tipo string.`,
      );
    }
    return {
      type: "NEXT",
      target: matchedChoice.nextNode,
    };
  }

  // Fallback: Si ninguna condición devolvió true, se debe navegar obligatoriamente hacia 'otherwise'
  if (typeof node.otherwise !== "string") {
    throw new Error(
      `❌ ERROR: Ninguna condición del nodo 'choose' fue satisfecha y no se especificó una ruta de escape 'otherwise' válida.`,
    );
  }

  return {
    type: "NEXT",
    target: node.otherwise,
  };
};
