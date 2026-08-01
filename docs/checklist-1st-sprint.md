## Documento Técnico: Motor de Validación de Estado Estricto y Configurable (Estrategia de Tipado Atómico)

---

## 1. Principios de Diseño y Reglas Arquitectónicas

- **Aislamiento y Atomización:** Quedan prohibidos los tipos condicionales gigantescos y multipropósito. Cada restricción lógica (detectar tipos nativos, validar clases, verificar profundidad) se encapsuló en un tipo utilitario unitario e independiente con una única responsabilidad.
- **Testabilidad Unitaria de Tipos (Co-location):** Cada tipo utilitario cuenta con su correspondiente suite de pruebas estáticas en su misma ubicación física. Las aserciones se evalúan de forma explícita y lineal, validando flujos positivos y negativos sin ambigüedades.
- **Control de Mutaciones en Testing:** Para las pruebas que validan rechazos lógicos, se diseñó un token único de error (`TypeError<Msg>`) que sustituye al uso opaco de `never`. Esto permite contrastar el resultado directamente contra el token esperado de forma matemática.
- **Separación Absoluta de Conceptos:** El estado se divide en tres capas ortogonales e independientes:
  1. **Nomenclatura (Claves):** Validación gramatical basada en estrategias inyectables y alfabetos extraídos de strings continuos.
  2. **Valores Terminales (Hojas):** Tipos primitivos y nativos válidos que cierran las ramas del árbol de datos (sin interferir con estructuras jerárquicas).
  3. **Estructura (Nodos):** Mecanismos de agregación (Objetos planos y Arrays) y sus límites de anidación.

---

## 2. Plan de Ejecución Realizado (Checklist de Control)

## ✅ Paso 1: Infraestructura de Testing Estático de Tipos

- [x] Diseñar el utilitario de igualdad estricta `Equal<X, Y>` protegido contra modificadores de opcionalidad implícita mediante remoción homórfica (`-?`).
- [x] Diseñar el asertor explícito `Expect<T, Expected>` eliminando la necesidad de forzar directivas artificiales.
- [x] Implementar el sistema de tokens de rechazo legibles por humanos e IA (`TypeError<Msg>`) para dar significado semántico a los colapsos de tipos.

## ✅ Paso 2: Configuración del Ecosistema de Datos (Hojas Terminales)

- [x] Definir la lista blanca base `DefaultStateValue` que contiene los primitivos y nativos serializables seguros, excluyendo objetos y arrays de las hojas para evitar bypasses de asignabilidad.
- [x] Crear el utilitario de exclusión interactiva `ExcludeFromValue<TValue, TToExclude>` para permitir la mutilación selectiva de tipos en la lista blanca de forma transparente.

## ✅ Paso 3: Discriminadores Unitarios de Tipos de Estructuras

- [x] Diseñar y probar `IsPlainObject<T>`: Discrimina un objeto plano o DTO `{}` contra tipos nativos (`Date`, `Map`, `Set`, `RegExp`), funciones y primitivos.
- [x] Diseñar y probar `IsPlainArray<T>`: Valida de forma pura si una estructura es una lista indexada nativa o de solo lectura.

## ✅ Paso 4: Motor de Convención de Claves (Nomenclatura Avanzada)

- [x] Diseñar el extractor recursivo `StringToAlphabet<T>` que tritura strings continuos de entrada para generar uniones puras de caracteres automáticamente.
- [x] Implementar el validador gramatical recursivo de caracteres `IsValidStringByAlphabet<S, TAlphabet>`.
- [x] Crear el registro dinámico de estrategias inyectables `KeyStrategy<K>` exponiendo los criterios `"default"`, `"string"` y `"SCREAMING_SNAKE"` de forma extensible por el usuario.
- [x] Crear el validador superficial horizontal de llaves de objetos `ValidateObjectKeys<T, S>`.

## ✅ Paso 5: Validador Superficial de Estado (Shallow State Checker)

- [x] Crear `CheckStateShallow<T, TKey, TValue, AllowArrays>` para dar luz verde o propagar tokens de error específicos en la raíz (Nivel 1).

## ✅ Paso 6: Motor de Profundidad Recursiva y Ensamblaje Final

- [x] Implementar el decrementador matemático basado en tuplas (`Enumerate<N>` y `Decrement<N>`) en `state-counter.ts`.
- [x] Crear el pipeline central recursivo `CheckStateDeepInternal` acoplando de forma secuencial y aislada los validadores de nativos, arreglos (usando inferencia por `infer U`) y objetos anidados.
- [x] Refactorizar `CheckObjectDeep` para eliminar por completo el arrastre del parámetro genérico `TKey`, consumiendo la estrategia de nomenclatura (`TCasing`) de forma transparente.
- [x] Exponer la API pública definitiva `IsValidState<T, TValue, AllowArrays, TCasing, MaxLevel>` lista para producción.

---

## 3. Especificación Técnica: El Sistema de Claves Inyectable

El framework implementa un patrón de **Inyección de Estrategias de Nomenclatura**. En lugar de forzar restricciones rígidas o arrastrar tipos genéricos de llaves a través de todo el árbol recursivo, el motor deep expone una firma limpia donde se inyecta el identificador de la estrategia de la interfaz `KeyStrategy`.

Cualquier desarrollador puede extender los formatos de nomenclatura del core sin alterar los archivos de la librería mediante _Declaration Merging_:

```typescript
// Extensión transparente en el código del usuario:
declare module "./object-keys.js" {
  interface KeyStrategy<K extends string | number | symbol> {
    SOLO_BINARIO: K extends string
      ? IsValidStringByAlphabet<K, StringToAlphabet<"01">>
      : false;
  }
}
```

El validador profundo propagará esta nueva regla de forma automática a todos los subniveles del objeto durante la fase de compilación del Build (`npm run build`).
