// // 1. EL REGISTRO DE ACCIONES (El contenedor de infraestructura)
// // Aquí declaramos las funciones reales de red, bases de datos o servicios.
// // NOTAS
// // Está bien, simplemente porque no importa cómo sean las funciones.
// // Ni si son síncronas o asíncronas.
// // Tampoco importa la forma ni el los parámetros, ni el tipo de retorno. Libertad total para el desarrollador.
// // Dentro del workflow podría ir como parámetro en el constructor o en curring
// // La esperanza es inyectarlo en el workflow hardwired
// // Más tarde vemos como lo acoplamos en el workflow
// export const misAccionesGlobales = {
//   "pasarela.cobrar": async (context: { usuarioId: string; monto: number }) => {
//     // Simulamos un fallo de negocio real. Devuelve éxito o código de error.
//     return { success: false, error: "FONDO_INSUFICIENTE" };
//   },
//   "notificaciones.enviar_alerta": async (context: { usuarioId: string }) => {
//     return { success: true, data: { enviado: true } };
//   },
// };

// // 2. EL ESTADO DEL WORKFLOW (Los datos inmutables que viajan en el tiempo)
// // NOTAS
// // Perfecto. Sólo que el workflow va a tener como restricción que el estado sea serializable
// export interface MiEstadoDeNegocio {
//   usuarioId: string;
//   montoACobrar: number;
//   intentosRealizados: number;
// }

// // 3. LA EXPRESIÓN FINAL DEL GRAFO (Lo que el programador escribe)
// // Aquí definimos el mapa declarativo de cómo se comporta el negocio.
// // NOTAS:
// // a este lo voy a reescribir con sus aclaraciones
// // agrego la función para curring. podría ser un objeto
// // dado que instanciarse con registros construidos con sus dependencias,
// // p.e. obtener el usuario en función de las credenciales del request
// export const defineWorkflow =
//   <TState, TRegistry, TMutations<TState>>() => //
//   (registry: TRegistry) => ({
//     id: "cobro_recurrente_v2",
//     start: {
//       // el nombre es fijo
//       type: "action",
//       action: async () => {
//         // los parámetros que digas, state, payload tal como las mutations o context indicando el state y los parámetros. lo discutamos
//       },
//       onSuccess: "intentar_pago",
//     },
//     intentar_pago: {
//       type: "action",
//       actionId: (state, context) => {
//         const result = registry["pasarela.cobrar"](context);
//         if(result.success) {
//           // aplica las mutaciones al estado en función del resultado
//           // y retorna success
//           return context.next('activar_suscripcion');
//         }
//         // en este punto se podrían hacer varias cosas, p.e. un case para ser exhaustivo en el
//         // control de errores y
//         switch(result.error) {
//           case "FONDO_INSUFICIENTE":
//             return context.next('evaluar_limite_intentos');
//           case "TARJETA_EXPIRADA":
//             return context.next('notificar_error_tarjeta');
//           default:
//             return context.next('abortar');
//         }
//         return result
//       },
//       // dejo esta parte por si te parece mejor devolver el result diractamente y no la clave el siguiente paso
//       onSuccess: "activar_suscripcion", // Próximo nodo si success es true
//       onErrors: {
//         FONDO_INSUFICIENTE: "evaluar_limite_intentos", // Próximo nodo según el código de error exacto
//         TARJETA_EXPIRADA: "notificar_error_tarjeta",
//       },
//     },

//     // CASO B: NODO DE DECISIÓN PURA (Evalúa datos en memoria de forma síncrona)
//     evaluar_limite_intentos: {
//       type: "choose",
//       choices: [
//         {
//           condition: (state: MiEstadoDeNegocio) =>
//             state.intentosRealizados >= 3,
//           nextNode: "suspender_cuenta",
//         },
//         {
//           condition: (state: MiEstadoDeNegocio) => state.intentosRealizados < 3,
//           nextNode: "pausa_espera",
//         },
//       ],
//     },

//     // CASO C: NODO DE SUSPENSIÓN TEMPORAL (Delays en el tiempo)
//     pausa_espera: {
//       type: "delay",
//       durationMs: 24 * 60 * 60 * 1000, // 24 horas de espera
//       onTimeout: "intentar_pago", // Al expirar, vuelve a intentar la acción
//     },

//     // CASO D: NODOS DE CIERRE (Estados terminales que finalizan el Workflow)
//     activar_suscripcion: {
//       type: "end",
//       status: "SUCCESS",
//     },

//     suspender_cuenta: {
//       type: "end",
//       status: "FAILED",
//     },

//     notificar_error_tarjeta: {
//       type: "end",
//       status: "FAILED",
//     },

//     abortar: {
//       type: "end",
//       status: "FAILED",
//     },
//   });
