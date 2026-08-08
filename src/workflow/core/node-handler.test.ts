import { test } from "node:test";
import assert from "node:assert/strict";
import { ExpectEqual } from "../../core/testing.types.js";
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

test("Workflow - NodeHandler: Uso Correcto y Validación Estática de NodeHandlerParams", () => {
  function testParamsCorrectos() {
    type Params = NodeHandlerParams<EstadoTest, ServicesTest, NodosTest>;

    const baseCtx = createRuntimeContext<EstadoTest, NodosTest>(() => {});

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
    type CheckState = ExpectEqual<typeof paramsValidos.state.contador, number>;

    // Verificación estática del servicio
    const resServicio = paramsValidos.context.services.miServicio();
    type CheckServices = ExpectEqual<typeof resServicio, string>;
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
    type Params = NodeHandlerParams<EstadoTest, ServicesTest, NodosTest>;

    const baseCtx = createRuntimeContext<EstadoTest, NodosTest>(() => {});

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

    // ❌ ERROR: Campo inexistente en TState
    // @ts-expect-error
    params.context.mutate({ campoInexistente: true });

    // ❌ ERROR: Tipo incorrecto para un campo del estado
    // @ts-expect-error
    params.context.mutate({ contador: "texto_invalido" });

    // ❌ ERROR: Servicio inexistente en el objeto services
    // @ts-expect-error
    params.context.services.servicioInexistente();
  }

  function testFalloHandler() {
    type TestHandler = NodeHandler<EstadoTest, ServicesTest, NodosTest>;

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
  let patchRecibido: Partial<EstadoTest> | null = null;

  const baseCtx = createRuntimeContext<EstadoTest, NodosTest>((patch) => {
    patchRecibido = patch;
  });

  const contextFull = {
    ...baseCtx,
    services: { miServicio: () => "OK" },
  };

  const map: NodeHandlersMap<EstadoTest, ServicesTest, NodosTest> = {
    custom: async ({
      state,
      context,
    }: NodeHandlerParams<EstadoTest, ServicesTest, NodosTest>) => {
      const info = context.services.miServicio();
      context.mutate({ contador: state.contador + (info === "OK" ? 10 : 0) });
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
  assert.deepStrictEqual(patchRecibido, { contador: 15 });
});
