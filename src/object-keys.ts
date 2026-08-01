import { TypeError } from "./types-testing.js";

export type ERR_NOMENCLATURA_INVALIDA =
  TypeError<"❌ ERROR: Las llaves del objeto no cumplen con el formato de convención requerido.">;

// Alfabeto de minúsculas para el validador estricto SCREAMING_SNAKE
type LetrasMinusculas =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

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
    ? K extends `${string}${LetrasMinusculas}${string}`
      ? false
      : K extends `${string} ${string}`
        ? false
        : K extends `_${string}`
          ? false
          : K extends `${string}_`
            ? false
            : K extends `${string}__${string}`
              ? false
              : true
    : false;
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
