import { EventLog } from "./mutations.js";

/**
 * Servicio autónomo de Replay (Viaje en el tiempo).
 * Consume un mapa de mutaciones puras para reproducir historiales de eventos tipados.
 */
export function createReplay<TState, TMethods>(methods: TMethods) {
  return {
    /**
     * Toma un estado inicial y un diario de eventos fuertemente tipado,
     * reproduciendo secuencialmente cada transformación para devolver el estado final resultante.
     */
    play: (initialState: TState, eventLog: EventLog<TMethods>): TState => {
      // Usamos un reduce nativo para aplicar las transformaciones secuencialmente en cascada
      return eventLog.reduce((currentState, event) => {
        const targetMutation = (methods as any)[event.type];
        if (!targetMutation) return currentState;

        // Ejecutamos la mutación pura pasándole el estado actual y el payload del evento
        const result = targetMutation(currentState, (event as any).payload);

        // Fusionamos de forma segura el estado actual con el parcial devuelto
        return { ...currentState, ...result };
      }, initialState);
    },
  };
}
