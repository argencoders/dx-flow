/**
 * Tipos de datos primitivos y nativos del sistema considerados puros y serializables.
 * Sirve como la lista blanca por defecto para los valores de las hojas del estado.
 */
export type DefaultStateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>;

/**
 * Utilitario interactivo para remover tipos específicos de la lista blanca de valores.
 * Permite personalizar dinámicamente qué datos terminales acepta el estado.
 */
export type ExcludeFromValue<TValue, TToExclude> = Exclude<TValue, TToExclude>;
