import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeEndHandler } from "./node-end.js";
import { createRuntimeContext } from "./context.js";
import { NodeHandlerParams } from "./node-handler.js";
import { NodeDefinitions } from "./validator.js";
import { defineWorkflow } from "./factory.js";

interface EstadoTest {
  saldo: number;
}
type NodosTest = "inicio" | "fin_exito" | "fin_error";
interface RegistryTest {}
interface MutacionesTest {}

type NodeEndDef = NodeDefinitions<
  EstadoTest,
  RegistryTest,
  NodosTest,
  MutacionesTest
>["end"];

test("Workflow - NodeEnd: Ejecución Exitosa devolviendo el estado final (END status)", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  // 1. Caso Éxito
  const nodeEndExito: NodeEndDef = {
    type: "end",
    status: "COMPLETADO",
  };

  const paramsExito: NodeHandlerParams<
    EstadoTest,
    RegistryTest,
    NodosTest,
    MutacionesTest
  > = {
    node: nodeEndExito,
    state: { saldo: 100 },
    context: contextFull,
  };

  const resExito = await nodeEndHandler(paramsExito);
  assert.equal(resExito.type, "END");
  if (resExito.type === "END") {
    assert.equal(resExito.status, "COMPLETADO");
  }

  // 2. Caso Error de Negocio / Cancelado
  const nodeEndError: NodeEndDef = {
    type: "end",
    status: "FONDOS_INSUFICIENTES",
  };

  const resError = await nodeEndHandler({
    ...paramsExito,
    node: nodeEndError,
  });
  assert.equal(resError.type, "END");
  if (resError.type === "END") {
    assert.equal(resError.status, "FONDOS_INSUFICIENTES");
  }
});

test("Workflow - NodeEnd: Escenarios de Fallo Detectados en Tiempo de Compilacion (@ts-expect-error)", () => {
  function testFalloTipado() {
    const wf = defineWorkflow<
      EstadoTest,
      RegistryTest,
      MutacionesTest
    >();

    // ❌ ERROR 1: Falta la propiedad requerida 'status'
    wf.create({
      id: "err1",
      nodes: {
        // @ts-expect-error - Falta propiedad status
        start: {
          type: "end",
        },
      },
    });

    // ❌ ERROR 2: 'status' no es un string
    wf.create({
      id: "err2",
      nodes: {
        start: {
          type: "end",
          // @ts-expect-error - status debe ser un string
          status: 404,
        },
      },
    });
  }
});

test("Workflow - NodeEnd: Escenarios de Fallo de Runtime", async () => {
  const baseCtx = createRuntimeContext<
    EstadoTest,
    NodosTest,
    MutacionesTest
  >(() => {});
  const contextFull = { ...baseCtx, registry: {} };

  // 1. Falta la propiedad status
  await assert.rejects(
    async () => {
      await nodeEndHandler({
        node: { type: "end" },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'end' debe especificar una propiedad 'status' de tipo string.",
    },
  );

  // 2. status no es un string
  await assert.rejects(
    async () => {
      await nodeEndHandler({
        node: { type: "end", status: 123 },
        state: { saldo: 0 },
        context: contextFull,
      });
    },
    {
      message:
        "❌ ERROR: El nodo de tipo 'end' debe especificar una propiedad 'status' de tipo string.",
    },
  );
});
