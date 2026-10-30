import type { ChangelogEntry } from "./changelog.js";

export const esEntries: ChangelogEntry[] = [

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
