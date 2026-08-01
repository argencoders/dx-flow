# Motor de Convención de Nomenclatura de Claves

## 1. Principio de Diseño

Desacopla la validación de texto de la lógica estructural del framework. Permite definir, validar y extender las reglas de escritura (Casing) de las llaves de cualquier objeto mediante el uso de gramáticas y alfabetos basados en cadenas de texto continuas.

## 2. Especificación Técnica

- `StringToAlphabet<T>`: Tritura strings literales legibles (ej: `"ABC"`) y los transforma automáticamente en uniones de caracteres individuales (`"A" | "B" | "C"`).
- `IsValidStringByAlphabet<S, TAlphabet>`: Validador gramatical recursivo que inspecciona strings carácter por carácter de izquierda a derecha.
- `KeyStrategy<K>`: Registro de estrategias inyectables mediante _Declaration Merging_. Soporta nativamente las estrategias `"default"`, `"string"` y `"SCREAMING_SNAKE"`.

## 3. Ejemplo de Extensión por el Usuario

Cualquier desarrollador puede inyectar nuevas convenciones sin alterar el núcleo del framework:

```typescript
declare module "./object-keys.js" {
  interface KeyStrategy<K extends string | number | symbol> {
    SOLO_BINARIO: K extends string
      ? IsValidStringByAlphabet<K, StringToAlphabet<"01">>
      : false;
  }
}
```
