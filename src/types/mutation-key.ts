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
 * Si encuentra cualquier otra cosa (espacios, guiones medios, caracteres especiales), lo rechaza.
 */
type CheckAllowedCharacters<S extends string> =
  S extends `${infer Head}${infer Tail}`
    ? Head extends AlphanumericCharacters | "_"
      ? Tail extends ""
        ? S
        : CheckAllowedCharacters<Tail>
      : never
    : never;

/**
 * Validador recursivo para evitar secuencias de guiones bajos consecutivos.
 */
type CheckMiddleSequence<S extends string> =
  S extends `${infer Head}__${infer Tail}`
    ? never
    : S extends `${infer Head}_${infer Tail}`
      ? CheckMiddleSequence<Tail>
      : S;

/**
 * Tipo utilitario estricto para validar el formato de llaves de mutación.
 */
export type MutationKey<K> = K extends string
  ? CheckAllowedCharacters<K> extends never
    ? never
    : K extends `_${string}`
      ? never // Rechaza si empieza con guion bajo (Constante Estructural)
      : K extends `${string}_`
        ? never // Rechaza si termina con guion bajo (Constante Estructural)
        : CheckMiddleSequence<K> extends never
          ? never
          : K
  : never;
