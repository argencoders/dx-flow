import { TypeError } from "../core/testing.types.js";

export type ERR_NOMENCLATURA_INVALIDA =
  TypeError<"❌ ERROR: Las llaves del objeto no cumplen con el formato de convención requerido.">;

/**
 * Transforma un string literal (o una unión de strings) en una unión de caracteres individuales.
 * Ejemplo: StringToAlphabet<"ABC"> resuelve automáticamente a "A" | "B" | "C"
 */
export type StringToAlphabet<T extends string> =
  T extends `${infer Caracter}${infer Resto}`
    ? Caracter | StringToAlphabet<Resto>
    : never;

// Extraemos el alfabetos dinámicamente desde un string continuo
type LetrasMayusculas = StringToAlphabet<"ABCDEFGHIJKLMNOPQRSTUVWXYZ">;
type Numeros = StringToAlphabet<"0123456789">;
type SimbolosValidos = "_" | "-";
type LetrasMinusculas = StringToAlphabet<"abcdefghijklmnopqrstuvwxyz">;

/**
 * Validador Gramatical Recursivo:
 * Revisa el string carácter por carácter de izquierda a derecha.
 * Si encuentra un solo carácter que NO está en el alfabeto 'TAlphabet', colapsa a 'false'.
 */
export type IsValidStringByAlphabet<
  S extends string,
  TAlphabet,
> = S extends `${infer Caracter}${infer Resto}`
  ? Caracter extends TAlphabet
    ? IsValidStringByAlphabet<Resto, TAlphabet> // El carácter es válido, seguimos con el resto
    : false // ❌ Carácter ilegal detectado
  : true; // ✅ Llegamos al final del string sin caracteres ilegales

/**
 * Registro de firmas unitarias para validación de una única clave 'K'.
 */
export interface KeyStrategy<K extends string | number | symbol> {
  // 1. "default": Admite cualquier tipo primitivo de llave nativa (comportamiento actual)
  default: true;

  // 2. "string": Fuerza a que la llave sea estrictamente una cadena de texto
  string: K extends string ? true : false;

  // 3. "SCREAMING_SNAKE": Fuerza mayúsculas sostenidas con guiones bajos (Rechaza minúsculas, espacios, guiones huérfanos)
  SCREAMING_SNAKE: K extends string
    ? K extends `_${string}`
      ? false // ❌ No guiones al inicio
      : K extends `${string}_`
        ? false // ❌ No guiones al final
        : K extends `${string}__${string}`
          ? false // ❌ No guiones dobles
          : IsValidStringByAlphabet<K, LetrasMayusculas | Numeros | "_">
    : false; // ❌ No es un string literal
}

// Tipo unión de los nombres de los validadores disponibles
export type ValidatorStrategy = keyof KeyStrategy<any>;

/**
 * Validador superficial que recorre las llaves de un objeto 'T'.
 * Si todas las llaves cumplen con la estrategia 'S', devuelve el objeto 'T' intacto.
 * Si al menos una llave falla, colapsa devolviendo el token de error.
 */
export type ValidateObjectKeys<
  T,
  S extends ValidatorStrategy = "default",
> = false extends { [K in keyof T]: KeyStrategy<K>[S] }[keyof T]
  ? ERR_NOMENCLATURA_INVALIDA
  : T;
