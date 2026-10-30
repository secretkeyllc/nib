import type { ChangelogEntry } from "./changelog.js";

export const esEntries: ChangelogEntry[] = [

  {
    version: "0.22.6",
    date: "2026-10-30",
    highlights: [
      "La compilación de macOS ahora sí está firmada ad-hoc, así que Apple Silicon la abre.",
    ],
  },
  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "La descarga de macOS ya es una compilación real: firmada ad-hoc, Apple Silicon la inicia tras una aprobación única en Ajustes del Sistema.",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "Las compilaciones de macOS se publican como beta: firmadas ad-hoc, así que el primer arranque necesita una aprobación única en Ajustes del Sistema.",
      "El instalador de Windows on Arm ya no pierde Nib.exe en silencio y rechaza instalarse en un equipo x64.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "El servicio local vuelve a iniciarse en Windows on Arm: el runtime ahora se enlaza estáticamente.",
      "Instalar la versión Arm en un equipo x64 ahora se detiene con un mensaje claro.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "El instalador de Windows on Arm vuelve a extraer Nib.exe y todas las DLL.",
      "El instalador de Arm se detiene con un aviso en un equipo x64 en lugar de instalar una carpeta vacía.",
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
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Primera versión pública de Nib: una instalación, un inicio de sesión, todos los modelos.",
      "Inicia sesión con una cuenta Nib; la página de aprobación abre con el código puesto.",
      "El compositor muestra el plan, los créditos restantes y el uso diario/semanal/mensual.",
      "Los anuncios del administrador aparecen sobre los resultados de tareas.",
      "Se publican un instalador para Windows x64 y AppImage/deb para Linux.",
    ],
  },
];
