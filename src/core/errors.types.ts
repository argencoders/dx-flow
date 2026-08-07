/**
 * Encapsula un mensaje de error legible por humanos e IA dentro del sistema de tipos de la aplicación.
 * Se utiliza para reemplazar 'never' por un token de error explícito.
 */
export type TypeError<Message extends string> = {
  readonly __type_error__: Message;
};
