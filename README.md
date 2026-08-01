## Documento Técnico: Motor de Validación de Estado Estricto y Configurable (Estrategia de Tipado Atómico)

---

## [x] 1. Principios de Diseño y Reglas Arquitectónicas

- Aislamiento y Atomización: Quedan prohibidos los tipos condicionales gigantescos y multipropósito. Cada restricción lógica (detectar tipos nativos, validar claves, verificar profundidad) se encapsulará en un tipo utilitario unitario con una única responsabilidad.
- Testabilidad Unitaria de Tipos: Cada tipo utilitario creado deberá contar con su correspondiente suite de pruebas estáticas utilizando una aserción de igualdad estricta. Ningún tipo se integrará al motor sin haber sido validado de forma aislada.
- Control de Mutaciones en Testing: Para las pruebas que validen rechazos lógicos, se utilizará un token único de error (ERROR_TOKEN) en lugar de never. Esto permitirá forzar errores controlados con directivas // @ts-expect-error legibles, evitando falsos positivos de asignabilidad latente.
- Separación de Conceptos en el Estado: Se dividirá conceptualmente el estado en tres capas independientes:

1. Claves (Keys): Restricciones de nomenclatura sobre los identificadores (ej. strings puros). 2. Valores Terminales (Hojas): Tipos primitivos y nativos válidos que cierran las ramas del árbol de datos. 3. Estructura (Nodos): Mecanismos de agregación (Objetos planos y Arrays) y sus límites de anidación.

---

## 2. Plan de Ejecución Paso a Paso (Checklist)## ⬜ Paso 1: Infraestructura de Testing Estático de Tipos

- Diseñar el utilitario de igualdad estricta Equal<X, Y>.
- Diseñar el asertor Expect<T>.
- Implementar el sistema de tokens de rechazo legibles (TypeError<Msg>) para su uso con // @ts-expect-error sin que never enmascare fallos de asignabilidad cruzada.

## ⬜ Paso 2: Configuración del Ecosistema de Datos (Hojas Terminales)

- Definir el tipo unión DefaultStateValue que contenga los primitivos y nativos serializables seguros (string, number, boolean, null, undefined, Date, RegExp, Map, Set).
- Crear una utilidad de exclusión para permitir al desarrollador retirar tipos nativos de la lista blanca de forma interactiva (ej. ExcludeFromValue<Date>).

## ⬜ Paso 3: Discriminadores Unitarios de Tipos de Estructuras

- Diseñar y probar IsPlainObject<T>: Debe discriminar un objeto plano de datos {} contra Date, Array, Map, Set, funciones y primitivos.
- Diseñar y probar IsPlainArray<T>: Debe validar si una estructura es una lista pura iterable indexada por números.
- Propuesta del Sistema de Claves: Diseñar y probar ValidateKeys<T, AllowedKeyType>: Inspecciona si las propiedades de un tipo cumplen con la restricción (ej: excluir symbol o firmas de índice implícitas).

## ⬜ Paso 4: Validador Superficial (Shallow State Checker)

- Crear CheckStateShallow<T, TKey, TValue, AllowArrays> que ensamble los discriminadores anteriores para dar luz verde o roja a estructuras de Nivel 1.
- Validar con pruebas unitarias que rechaza funciones o tipos prohibidos inmediatamente en la raíz.

## ⬜ Paso 5: Motor de Profundidad Recursiva y Ensamblaje Final

- Implementar el decrementador numérico basado en tuplas (Enumerate<N> y Decrement<N>).
- Crear el motor recursivo CheckStateDeep que consuma los validadores unitarios de los pasos anteriores, propagando los tokens de error de abajo hacia arriba.
- Crear el tipo público IsValidState<T, ...> como API de consumo del framework.

---

## 3. Propuesta Técnica: El Sistema de Claves (ValidateKeys)

Para las claves, propongo un enfoque preventivo. El problema clásico es que keyof T extends string da verdadero para primitivos (debido a los métodos del prototipo). Por lo tanto, ValidateKeys operará únicamente si T ya pasó el filtro de ser un objeto plano.
Evaluará si todas las llaves declaradas pertenecen estrictamente al subconjunto permitido:

type ValidateKeys<T, AllowedKeyType> = keyof T extends AllowedKeyType ? true : false;

## Esto nos permite aislar el comportamiento de las llaves. Si el usuario desea bloquear symbol u obligar a que las llaves sean estrictamente strings numéricos, solo debe alterar el parámetro AllowedKeyType.
