import { test } from "node:test";
import { defineMutations, EventLog } from "./mutations.js";
import { createReplay } from "./replay.js";
import assert from "node:assert";

interface EstadoUsuario {
  nombre: string;
  edad: number;
}

test("Replay - Etapa 3: Reproducción Física de Historial en Runtime", () => {
  // 1. Declaramos las mutaciones puras
  const storeMutations = defineMutations<EstadoUsuario>().create({
    INCREMENTAR_EDAD: (state) => ({ edad: state.edad + 1 }),
    CAMBIAR_NOMBRE: (state, nuevoNombre: string) => ({ nombre: nuevoNombre }),
  });

  // 2. Inicializamos el servicio de Replay pasándole las mutaciones
  const replayService = createReplay<EstadoUsuario, typeof storeMutations>(
    storeMutations,
  );

  const estadoInicial: EstadoUsuario = { nombre: "Alex", edad: 25 };

  // 3. Declaramos un diario de eventos reales fuertemente tipado por nuestro framework
  const diarioDeEventos: EventLog<typeof storeMutations> = [
    { type: "INCREMENTAR_EDAD" },
    { type: "INCREMENTAR_EDAD" },
    { type: "CAMBIAR_NOMBRE", payload: "Juan" },
    { type: "INCREMENTAR_EDAD" },
  ];

  // 4. Ejecutamos la prueba de fuego: reproducir el historial completo
  const estadoFinal = replayService.play(estadoInicial, diarioDeEventos);

  // 5. Aserciones de control runtime: Alex (25) + 3 incrementos = 28. Nombre final = Juan.
  assert.strictEqual(estadoFinal.edad, 28);
  assert.strictEqual(estadoFinal.nombre, "Juan");

  // Verificamos que el estado inicial se mantuvo inmutable por pureza funcional
  assert.strictEqual(estadoInicial.edad, 25);
  assert.strictEqual(estadoInicial.nombre, "Alex");
});
