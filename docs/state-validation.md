# Motor de Validación de Estado Estricto y Configurable

## 1. Principios de Diseño

Cada restricción lógica se encapsula en tipos utilitarios unitarios con una única responsabilidad, los cuales son coordinados secuencialmente a través de un pipeline recursivo profundo.

## 2. Capas de Validación Ensambladas

1. **Fase Superficial (`CheckStateShallow`):** Filtra de forma inmediata en el Nivel 1 que la raíz sea un objeto plano o un arreglo permitido, verificando la nomenclatura inicial.
2. **Pipeline Profundo (`CheckStateDeepInternal`):**
   - **Escudo de Nativos:** Somete a los objetos del sistema (`Date`, `Map`) a las restricciones de `TValue`.
   - **Recorredor de Arrays:** Extrae el tipo interno mediante inferencia (`infer U`) e inspecciona las listas.
   - **Recorredor de Objetos:** Controla recursivamente los límites de profundidad (`MaxLevel`) mediante decrementadores de tuplas y delega el casing de las llaves de forma implícita a través del parámetro `TCasing`.

## 3. API Pública Definitiva

```typescript
export type IsValidState<
  T,
  TValue = DefaultStateValue,
  AllowArrays extends boolean = true,
  TCasing extends ValidatorStrategy = "default",
  MaxLevel extends number = 2
>
```
