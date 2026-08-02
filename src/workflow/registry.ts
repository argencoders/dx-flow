import { Result } from "./result.js";

/**
 * Firma genérica que debe cumplir cualquier acción ejecutable dentro del ecosistema IoC.
 */
export type WorkflowAction = (context: any) => Promise<Result<any, any>>;

/**
 * Extrae de forma automática y quirúrgica la unión de strings de errores
 * de una acción específica dentro del registro global de acciones.
 */
export type ExtractActionErrors<
  TRegistry,
  TActionId extends keyof TRegistry,
> = TRegistry[TActionId] extends (
  context: any,
) => Promise<Result<any, infer TErrors>>
  ? TErrors
  : never;
