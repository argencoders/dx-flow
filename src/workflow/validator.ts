import { DeepReadonly } from "../core/deep-readonly.js";
import { WorkflowContext, NavigationResult } from "./context.js";

/**
 * 💡 EL REGISTRO DE EXTENSIBILIDAD DE NODOS:
 * Cada propiedad representa un tipo de nodo ejecutable. El usuario puede extender
 * esta interfaz mediante Declaration Merging para inyectar fisonomías personalizadas.
 */
export interface NodeDefinitions<TState, TRegistry, TNodesList extends string> {
  // A. Nodo de Acción Asíncrona con Inyección IoC
  action: {
    type: "action";
    action: (
      state: DeepReadonly<TState>,
      context: WorkflowContext<TState, TNodesList> & { registry: TRegistry },
    ) => Promise<NavigationResult> | NavigationResult;
    onSuccess: TNodesList;
  };

  // B. Nodo de Decisión Pura basado en datos del estado
  choose: {
    type: "choose";
    choices: Array<{
      condition: (state: DeepReadonly<TState>) => boolean;
      nextNode: TNodesList;
    }>;
  };

  // C. Nodo de Suspensión Temporal en el Tiempo
  delay: {
    type: "delay";
    durationMs: number;
    onTimeout: TNodesList;
  };

  // D. Nodo Terminal Autodefinido (SUCCESS / FAILED / ABORTED o lo que el negocio dicte)
  end: {
    type: "end";
    status: string; // Libertad total para el estatus de cierre
  };
}

/**
 * Validador Homórfico de Estructura de Nodos:
 * Recorre el mapa de nodos del programador y cruza cada propiedad contra las firmas
 * válidas registradas en la interfaz de extensión 'NodeDefinitions'.
 */
export type ValidateGraphNodes<
  TNodes,
  TState,
  TRegistry,
  TNodesList extends string,
> = {
  [K in keyof TNodes]: TNodes[K] extends { type: infer TType }
    ? TType extends keyof NodeDefinitions<TState, TRegistry, TNodesList>
      ? TNodes[K] extends NodeDefinitions<TState, TRegistry, TNodesList>[TType]
        ? TNodes[K] // ✅ La estructura del nodo cumple perfectamente con la definición inyectada
        : NodeDefinitions<TState, TRegistry, TNodesList>[TType] // ❌ Si falla, fuerza el contrato exacto para pintar la línea roja
      : `❌ ERROR: El tipo de nodo '${TType & string}' no está registrado en el framework.`
    : TNodes[K];
};
