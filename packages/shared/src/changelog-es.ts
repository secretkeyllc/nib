import type { ChangelogEntry } from "./changelog.js";

export const esEntries: ChangelogEntry[] = [

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
