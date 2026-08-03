import { test } from "node:test";
import assert from "node:assert/strict";
import { Expect } from "../../core/types-testing.js";
import {
  NodeHandlerResult,
  NodeHandlerParams,
  NodeHandler,
  NodeHandlersMap,
} from "./node-handler.js";
import { createRuntimeContext } from "./context.js";

interface EstadoTest {
  contador: number;
}
type NodosTest = "nodo_a" | "nodo_b";
interface ServicesTest {
  miServicio: () => string;
}
interface MutacionesTest {
  INCREMENTAR: (state: EstadoTest, p: number) => void;
}

test("Workflow - NodeHandler: Uso Correcto y Validación Estática de NodeHandlerParams", () => {
  function testParamsCorrectos() {
    type Params = NodeHandlerParams<
      EstadoTest,
      ServicesTest,
      NodosTest,
      MutacionesTest
    >;

    const baseCtx = createRuntimeContext<
      EstadoTest,
      NodosTest,
      MutacionesTest
    >(() => {});

    const paramsValidos: Params = {
      node: { type: "test" },
      state: { contador: 10 },
      context: {
        ...baseCtx,
        services: { miServicio: () => "OK" },
      },
      delayFn: async (ms) => {},
    };

    // Verificación estática del estado inmutable
    type CheckState = Expect<typeof paramsValidos.state.contador, number>;

    // Verificación estática del servicio
    const resServicio = paramsValidos.context.services.miServicio();
    type CheckServices = Expect<typeof resServicio, string>;
  }
});

test("Workflow - NodeHandler: Escenarios de Fallo Detectados por el Compilador (@ts-expect-error)", () => {
  function testFalloResult() {
    type Res = NodeHandlerResult<NodosTest>;

    // ❌ ERROR: Nodo objetivo fantasma que no existe en NodosTest
    // @ts-expect-error
    const targetInvalido: Res = { type: "NEXT", target: "NODO_FANTASMA" };

    // ❌ ERROR: Tipo de discriminador no reconocido
    // @ts-expect-error
    const tipoInvalido: Res = { type: "OTRO_TIPO", target: "nodo_a" };
  }

  function testFalloParams() {
    type Params = NodeHandlerParams<
      EstadoTest,
      ServicesTest,
      NodosTest,
      MutacionesTest
    >;

    const baseCtx = createRuntimeContext<
      EstadoTest,
      NodosTest,
      MutacionesTest
    >(() => {});

    // ❌ ERROR: Infracción de inmutabilidad sobre DeepReadonly<EstadoTest>
    const params: Params = {
      node: { type: "test" },
      state: { contador: 5 },
      context: {
        ...baseCtx,
        services: { miServicio: () => "OK" },
      },
    };
    // @ts-expect-error - No se puede mutar una propiedad readonly
    params.state.contador = 20;

    // ❌ ERROR: Mutación inexistente en el contexto
    // @ts-expect-error
    params.context.mutate("MUTACION_INEXISTENTE", 123);

    // ❌ ERROR: Payload con tipo incorrecto para INCREMENTAR (espera number, se pasa string)
    // @ts-expect-error
    params.context.mutate("INCREMENTAR", "texto_invalido");

    // ❌ ERROR: Servicio inexistente en el objeto services
    // @ts-expect-error
    params.context.services.servicioInexistente();
  }

  function testFalloHandler() {
    type TestHandler = NodeHandler<
      EstadoTest,
      ServicesTest,
      NodosTest,
      MutacionesTest
    >;

    // ❌ ERROR: El handler retorna un target inválido que no pertenece a NodosTest
    // @ts-expect-error
    const handlerRoto: TestHandler = async ({ context }) => {
      return { type: "NEXT", target: "NODO_FANTASMA" };
    };

    // ❌ ERROR: El handler retorna una estructura con discriminador falso
    // @ts-expect-error
    const handlerDiscriminadorRoto: TestHandler = async () => {
      return { type: "INVALID_DISCRIMINATOR" };
    };
  }
});

test("Workflow - NodeHandler: Estructura de NodeHandlersMap y Ejecución Atómica", async () => {
  let mutacionLlamada = "";
  let payloadLlamado = 0;

  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >((key, payload) => {
    mutacionLlamada = String(key);
    payloadLlamado = payload;
  });

  const contextFull = {
    ...baseCtx,
    services: { miServicio: () => "OK" },
  };

  const map: NodeHandlersMap<
    EstadoTest,
    ServicesTest,
    NodosTest,
    MutacionesTest
  > = {
    custom: async ({ state, context }: NodeHandlerParams<EstadoTest, ServicesTest, NodosTest, MutacionesTest>) => {
      const info = context.services.miServicio();
      context.mutate("INCREMENTAR", state.contador + (info === "OK" ? 10 : 0));
      return { type: "NEXT", target: "nodo_b" };
    },
  };

  const res = await map.custom({
    node: { type: "custom" },
    state: { contador: 5 },
    context: contextFull,
  });

  assert.equal(res.type, "NEXT");
  if (res.type === "NEXT") {
    assert.equal(res.target, "nodo_b");
  }
  assert.equal(mutacionLlamada, "INCREMENTAR");
  assert.equal(payloadLlamado, 15);
});
