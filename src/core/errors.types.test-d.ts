import type { TypeError } from "./errors.types.js";
import type { Equal, Expect, TypeSuite } from "./testing.types.js";

export type TestSuiteInfraestructuraTipos = TypeSuite<
  [
    // ===================================================================
    // PRUEBA DE TypeError (DX & Hover Tooltip a 0-runtime bytes)
    // ===================================================================

    // ✅ Verificación de estructura del token de error (Sin usar 'const' ni generar ts(6133))
    Expect<
      Equal<
        TypeError<"❌ ERROR: Formato inválido">,
        { readonly __type_error__: "❌ ERROR: Formato inválido" }
      >
    >,
  ]
>;
