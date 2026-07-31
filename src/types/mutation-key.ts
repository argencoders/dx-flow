/**
 * Bloques semánticos del alfabeto. Prettier los respeta en líneas separadas
 * y para un humano es evidente qué compone cada grupo.
 */
type AllowedAlphabetString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" | "0123456789";

/**
 * Convierte un string continuo en una unión de caracteres literales.
 */
type StringToUnion<S extends string> = S extends `${infer Char}${infer Rest}`
  ? Char | StringToUnion<Rest>
  : never;

/**
 * El conjunto de caracteres alfanuméricos puros permitidos (letras y números).
 * El guion bajo se excluye de aquí porque se valida como separador estructural.
 */
type AlphanumericCharacters = StringToUnion<AllowedAlphabetString>;

/**
 * Validador de Caracteres.
 * Analiza la cadena letra por letra. Cada carácter debe ser alfanumérico O un guion bajo.
 */
type CheckAllowedCharacters<
  S extends string,
  Original extends string,
> = S extends `${infer Head}${infer Tail}`
  ? Head extends AlphanumericCharacters | "_"
    ? Tail extends ""
      ? Original
      : CheckAllowedCharacters<Tail, Original>
    : `INVALID_KEY '${Original}' - Character '${Head}' is forbidden. Keys must be UPPERCASE alphanumeric with underscores.`
  : `INVALID_KEY '${Original}' - Empty string or invalid sequence.`;

/**
 * Validador recursivo para evitar secuencias de guiones bajos consecutivos.
 */
type CheckMiddleSequence<
  S extends string,
  Original extends string,
> = S extends `${infer Head}__${infer Tail}`
  ? `INVALID_KEY '${Original}' - Cannot contain consecutive underscores (__).`
  : S extends `${infer Head}_${infer Tail}`
    ? CheckMiddleSequence<Tail, Original>
    : Original;

/**
 * Tipo utilitario estricto para validar el formato de llaves de mutación.
 */
export type MutationKey<K> = K extends string
  ? CheckAllowedCharacters<K, K> extends infer CheckResult
    ? CheckResult extends K // Si el resultado del alfabeto no es la llave original, devuelve su mensaje de error
      ? K extends `_${string}`
        ? `INVALID_KEY '${K}' - Keys cannot start with an underscore (_).`
        : K extends `${string}_`
          ? `INVALID_KEY '${K}' - Keys cannot end with an underscore (_).`
          : CheckMiddleSequence<K, K>
      : CheckResult
    : never
  : "INVALID_KEY - Input must be a string literal.";
