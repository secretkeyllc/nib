import type { ChangelogEntry } from "./changelog.js";

export const esEntries: ChangelogEntry[] = [
{
    version: "0.22.42",
    date: "2026-11-07",
    highlights: [
      "Correcciones: el estado de emparejamiento queda en la misma linea que su etiqueta, el chip 全自动 destaca como el boton de compra, los enlaces de saldo y plan vuelven a abrir el navegador, y los turnos desde el telefono no suenan en el escritorio.",
    ],
  },

{
    version: "0.22.41",
    date: "2026-11-07",
    highlights: [
      "Correcciones de los comentarios de esta semana: el chip de permiso automático muestra su color de aviso, la entrada de recarga de saldo abre la página de facturación, las cuentas de prueba tienen un botón de compra en el popover de créditos, y Ajustes muestra el estado de emparejamiento en vivo.",
    ],
  },

{
    version: "0.22.40",
    date: "2026-11-07",
    highlights: [
      "Sesiones remotas mas silenciosas: los mensajes enviados desde el telefono ya no hacen sonar el escritorio, el despliegue del QR ya no tapa los botones del menu, y las opciones de compra estan en el menu de cuenta.",
    ],
  },

{
    version: "0.22.39",
    date: "2026-11-06",
    highlights: [
      "El indicador de contexto baja en cuanto compactas, el compositor remoto inicia chats nuevos con el modelo que muestra, y el texto del modo oscuro ya no es blanco puro.",
    ],
  },

{
    version: "0.22.38",
    date: "2026-11-06",
    highlights: [
      "Un enlace movil perdido se recupera solo: el token de emparejamiento se relee antes de cada reconexion, y un handshake rechazado espera un minuto en vez de bombardear el relay.",
    ],
  },

{
    version: "0.22.37",
    date: "2026-11-05",
    highlights: [
      "Las sesiones creadas desde el navegador se pueden borrar y se titulan con su primer mensaje, y un chat nuevo empieza con el modelo que muestra el compositor.",
    ],
  },

{
    version: "0.22.36",
    date: "2026-11-05",
    highlights: [
      "Una sesion creada desde el boton + junto a un proyecto en el navegador ahora se abre dentro de ese proyecto, y la barra lateral web muestra los nombres reales de tus proyectos en lugar de claves remote-project sin procesar.",
      "La app renueva tu sesion de Nib en segundo plano: sigues conectado mas alla de las 24 horas y todas las superficies - el menu de cuenta, el chip de creditos, la lista de modelos - muestran el mismo estado tras un fallo de red.",
    ],
  },

{
    version: "0.22.35",
    date: "2026-11-05",
    highlights: [
      "El control remoto web ahora lee tu lista real de modelos, y los cambios de modelo, permisos, modo y nivel de pensamiento hechos desde el navegador se aplican de verdad: ambos comandos del host estaban rotos.",
      "Una conexion de relay estancada se termina tras dos latidos perdidos y se reconecta en segundos, en lugar de quedarse en silencio.",
    ],
  },

{
    version: "0.22.34",
    date: "2026-11-04",
    highlights: [
      "Los enlaces y chips de adjuntos en sesiones conectadas a un host ya se abren, y las copias de adjuntos subidas sobreviven a los reinicios del host.",
    ],
  },
{
    version: "0.22.33",
    date: "2026-11-04",
    highlights: [
      "Los chips de adjuntos ahora se abren en sesiones que se ejecutan en un host conectado sin un proyecto vinculado, y el selector Pro / Pro Extra del panel de créditos es legible en modo oscuro.",
    ],
  },
{
    version: "0.22.32",
    date: "2026-11-03",
    highlights: [
      "El inicio de sesión le saluda por su nombre, la ventana de créditos se lee correctamente en modo oscuro, los modelos -extra conservan los niveles de razonamiento del modelo base y ganan la etiqueta \"Extra\", y los chips de adjuntos en sesiones de conexión a host vuelven a abrirse.",
    ],
  },
{
    version: "0.22.31",
    date: "2026-11-03",
    highlights: [
      "La app ya no abre con una pantalla de error de React: un hook de estado de vista en el popover de creditos se declaraba despues de un return temprano, rompiendo el orden de hooks (React #310).",
    ],
  },

{
    version: "0.22.30",
    date: "2026-11-03",
    highlights: [
      "Los chips de archivos en sesiones remotas vuelven a abrirse: la vista de archivos reenvia el id de la sesion al Host, asi las lecturas se resuelven dentro del scratch autorizado de esa sesion.",
      "Los modelos -extra del gateway ahora muestran su ventana de contexto y capacidades reales: el catalogo toma el registro publicado del modelo base para los despliegues -extra.",
      "El menu de cuenta te saluda (Hi <nombre>, I am Nib.), muestra la asignacion Extra incluida bajo tu plan, y el popover de creditos del compositor anade pestanas Pro / Pro Extra.",
    ],
  },

{
    version: "0.22.29",
    date: "2026-11-03",
    highlights: [
      "Los chips de archivos subidos en una sesión ya se abren en todos los casos: cuando la búsqueda local no encuentra el archivo, la vista de archivos consulta al host que ejecutó las herramientas de la sesión y lee la copia en el directorio privado de esa sesión.",
    ],
  },
{
    version: "0.22.28",
    date: "2026-11-03",
    highlights: [
      "Hacer clic en un adjunto subido en una sesión remota ahora previsualiza la copia del Host: la vista de archivos resuelve las rutas remotas de scratch en el Host propietario, autorizando solo el directorio de esa sesión.",
    ],
  },

{
    version: "0.22.27",
    date: "2026-11-03",
    highlights: [
      "Los archivos añadidos con el botón + del compositor ahora usan el canal estructurado de adjuntos: el Host de la sesión remota recibe el archivo real y el prompt apunta a la copia remota, no a una ruta de escritorio ilegible.",
    ],
  },

{
    version: "0.22.26",
    date: "2026-11-03",
    highlights: [
      "Cada decisión de subida de adjuntos ahora se registra en el registro del escritorio, y el prompt resuelve el enlace remoto directamente desde el almacén de sesiones: se cierra la última vía de retroceso silencioso.",
    ],
  },

{
    version: "0.22.25",
    date: "2026-11-02",
    highlights: [
      "Los adjuntos de sesiones puramente remotas (el agente se ejecuta en el Host) ahora se suben al Host antes de iniciar el turno, y el texto del prompt apunta a la copia remota.",
      "El registro de sesión a host de ejecución sobrevive al reinicio del escritorio; tras una actualización los adjuntos siguen al host de las herramientas.",
    ],
  },

{
    version: "0.22.24",
    date: "2026-11-02",
    highlights: [
      "Los adjuntos de sesiones cuyas herramientas se ejecutan en un host remoto (incluidas sesiones de escritorio locales emparejadas con el host) ahora se suben automáticamente a ese host; el modelo lee el archivo real en lugar de una ruta local inservible.",
    ],
  },

{
    version: "0.22.23",
    date: "2026-11-02",
    highlights: [
      "Los adjuntos de una sesión conectada a un host remoto ahora se suben incluso sin carpeta de proyecto, en lugar de enviar una ruta local ilegible.",
      "Las copias remotas de adjuntos replican exactamente el diseño de almacenamiento del escritorio — misma sesión, directorio y nombres de archivo — las herramientas remotas los encuentran donde apunta la ruta local.",
      "El Composer ya no muestra un aviso permanente de subida; las subidas son silenciosas salvo que el turno falle.",
    ],
  },

{
    version: "0.22.22",
    date: "2026-11-02",
    highlights: [
      "En el modo de agente local + herramientas remotas, los adjuntos ahora se suben al directorio de sesión privado del Host remoto antes de iniciar la sesión.",
      "Read, Glob y Grep remotos pueden leer las copias subidas; la escritura sigue limitada a los bordes del proyecto.",
      "Cada archivo tiene un límite de 50 MiB y verificación SHA-256; el Composer indica que los adjuntos permanecen en el host remoto.",
    ],
  },

{
    version: "0.22.21",
    date: "2026-11-01",
    highlights: [
      "Las cuentas de Nib que ya tienen sesión iniciada cargan la lista completa de modelos tras actualizarse, sin pedir otro inicio de sesión.",
      "Los límites publicados de contexto y salida de la pasarela se aplican en Composer y en tiempo de ejecución, conservando las selecciones y sobrescrituras manuales guardadas.",
      "El descubrimiento de modelos se reintenta tras fallos temporales e ignora resultados obsoletos durante el cierre de sesión, la reautenticación o la recarga del complemento.",
    ],
  },

{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "Iniciar sesión en Nib ahora carga la lista completa de modelos de la pasarela de la cuenta con los límites de contexto y salida publicados.",
      "Volver a iniciar sesión conserva la selección de modelos y los límites manuales guardados mientras actualiza los valores publicados.",
      "Cerrar sesión y volver a iniciarla restaura los metadatos de los modelos; un fallo al consultarlos nunca bloquea un inicio de sesión válido.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "El clic en la fila del servicio Nib sigue su estado: cerrando sesión, un clic inicia sesión; con sesión abierta, abre el editor.",
      "Cambiar el formato de API en la fila Nib ahora se guarda correctamente — ya no se restablece a Chat Completions en cada guardado.",
      "El menú de modelos del compositor muestra exactamente los modelos habilitados en la fila Nib, no todo el catálogo del gateway.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "El servicio Nib es ahora una entrada de primera clase en la lista de modelos: haz clic en la fila para editarlo, etiquetado como \"Cuenta Nib\" con la marca de la app.",
      "La selección de modelos en la fila Nib se guarda correctamente — la primera apertura tras iniciar sesión selecciona todo lo que la cuenta puede llamar.",
      "Las filas Nib existentes migran a la dirección api.nib.am en el primer inicio tras actualizar.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "El servicio Nib en la lista de modelos ahora se puede editar como cualquier otro endpoint: formato de API, modelos y ajustes por modelo.",
      "La clave con la que inicia sesión el escritorio se llama \"Nib\" en la consola y no puede renombrarse ni eliminarse.",
      "Corregido: el número de versión reportado iba un release por detrás; la marca de inicio dice \"I am Nib\".",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "Un inicio de sesión expirado ahora se ve igual que la sesión cerrada: la clave Nib guardada se retira y el selector de modelos ya no ofrece entradas muertas.",
      "La entrada de ajustes de control remoto vuelve a mostrar su título y la insignia Experimental.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "El controlador web suma lo básico del espacio de trabajo: sesiones agrupadas por proyecto (grupos plegables), selector de modelo y cambio de modo en el compositor, lecturas de transcripción acotadas y títulos de sesión en una sola línea.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "El controlador web ahora carga el espacio de trabajo en escritorios 0.22.13 (la lectura del detalle de sesión usaba un nombre de argumento incorrecto) y lo recarga automáticamente cuando el escritorio se reconecta.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "El controlador web ya carga el espacio de trabajo real: los comandos remotos desenvuelven el mismo resultado que el renderizador, así que las sesiones, transcripciones y envíos ya no llegan vacíos.",
    ],
  },


  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "El emparejamiento del control remoto ahora sí se conecta: el escritorio se registraba con un sid aleatorio en lugar del que codifica el QR, así que cada intento del móvil se rechazaba como emparejamiento desconocido.",
    ],
  },


  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "El enlace de emparejamiento ahora es estable por equipo: escanea una vez y el móvil sigue funcionando al detener, reiniciar o reabrir la app.",
      "Una acción de rotación genera un enlace nuevo cuando haga falta y retira todos los QR escaneados antes.",
      "El menú de cuenta también incluye el emparejamiento: un toque despliega el código QR ahí mismo.",
      "Los emparejamientos pueden iniciarse automáticamente con la app, para conectar el móvil en cualquier momento.",
      "La mascota del espacio de trabajo estrena el arte 16:9 en ambos temas, y cada saludo del espacio vacío abre con la frase distintiva: \"I am Nib, …\".",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Controla este escritorio desde el móvil o cualquier navegador: Ajustes → Acerca de inicia un emparejamiento que solo tu propia cuenta puede abrir.",
      "La vista web refleja la lista de sesiones y la transcripción en vivo, envía mensajes y responde a las tarjetas de aprobación.",
      "El emparejamiento solo vive mientras se ejecuta: el enlace cambia en cada inicio y caduca al detenerse.",
      "El menú de cuenta también incluye el emparejamiento: un toque despliega el código QR ahí mismo.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "Los hosts remotos vuelven a instalarse en máquinas cuyo ~/.nib tiene los permisos 0755 habituales.",
      "Cada ventana de límite indica cuándo se restablece, en el chip de créditos y en la consola.",
      "El chip de versión muestra la versión instalada y no la pendiente.",
      "Ajustes -> Acerca de muestra la marca sobre el nombre.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "El sidecar de Windows on Arm ya no necesita el Visual C++ Redistributable.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Los hosts remotos se actualizan en su sitio: reconectar lleva el Host a esta versión sin necesidad de recrearlo.",
      "El indicador de créditos conserva el último saldo conocido cuando la plataforma no está accesible.",
      "Cambiar plan en el menú de cuenta abre ahora la página de facturación de la consola.",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Tras el cambio de dominio, la aplicación se conecta a nib.am.",
      "Los anuncios se abren en el sitio y pierden el punto de no leído.",
      "Informar de un problema y Notas de la versión apuntan al repositorio de Nib.",
      "Tras iniciar sesión en la web, el navegador puede devolverte a la aplicación.",
    ],
  },
];
