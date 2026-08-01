# Sistema de Inmutabilidad Estricta (`DeepReadonly`)

## 1. Principio de Diseño

Garantiza inmutabilidad absoluta a nivel de compilación para estructuras de datos complejas. Fuerza a que cualquier estado o mutación actúe bajo los principios de la programación pura, bloqueando efectos secundarios o modificaciones directas por referencia.

## 2. Especificación Técnica

El tipo utilitario descompone recursivamente objetos y arreglos, inyectando el modificador `readonly`. Incorpora una regla de cortocircuito (short-circuit) crítica para preservar intacta la cadena de prototipos y métodos de objetos nativos del sistema.

### Excepciones de Tipos Nativos Preservados:

- `Date` (Permite el uso nativo de `.getTime()`, `.toISOString()`, etc.)
- `RegExp`
- `Map<K, V>`
- `Set<T>`

## 3. Suite de Pruebas Unitarias (`src/core/deep-readonly.test.ts`)

Certifica de forma estática que:

- Bloquea reasignaciones de propiedades en primer nivel y capas profundas.
- Bloquea métodos mutadores en arreglos (como `.push()`).
- Conserva el autocompletado y tipado nativo de las funciones de los objetos del sistema.
