import type { ChangelogEntry } from "./changelog.js";

export const deEntries: ChangelogEntry[] = [

  {
    version: "0.22.7",
    date: "2026-10-30",
    highlights: [
      "Der Windows-on-Arm-Installer wird wieder in der Release-Pipeline gebaut.",
    ],
  },
  {
    version: "0.22.6",
    date: "2026-10-30",
    highlights: [
      "Der macOS-Build ist jetzt tatsächlich ad-hoc signiert, sodass Apple Silicon ihn öffnet.",
    ],
  },
  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "Der macOS-Download ist jetzt ein echter Build: ad-hoc signiert, Apple Silicon startet ihn nach einer einmaligen Freigabe in den Systemeinstellungen.",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "macOS-Builds erscheinen als Beta: ad-hoc signiert, daher ist beim ersten Start eine einmalige Freigabe in den Systemeinstellungen nötig.",
      "Der Windows-on-Arm-Installer verliert Nib.exe nicht mehr still und verweigert die Installation auf einem x64-PC.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Der lokale Dienst startet unter Windows on Arm wieder: die Laufzeit ist jetzt statisch gelinkt.",
      "Die Arm-Version bricht auf einem x64-PC jetzt mit einer klaren Meldung ab.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "Der Windows-on-Arm-Installer entpackt Nib.exe und alle DLLs wieder.",
      "Der Arm-Installer installiert auf einem x64-PC keine leeren Ordner mehr, sondern bricht mit einem Hinweis ab.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Remote-Hosts aktualisieren sich an Ort und Stelle: Ein erneutes Verbinden bringt den Host auf diese Version, ohne ihn neu einzurichten.",
      "Der Guthaben-Chip behält den letzten bekannten Stand, wenn die Steuerungsebene nicht erreichbar ist.",
      "„Tarif wechseln“ im Kontomenü öffnet jetzt die Abrechnungsseite der Konsole.",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Nach dem Domainwechsel verbindet sich die App mit nib.am.",
      "Ankündigungen öffnen sich direkt und verlieren ihren Ungelesen-Punkt.",
      "Problem melden und Versionshinweise verweisen jetzt auf das Nib-Repository.",
      "Nach der Web-Anmeldung kann der Browser zurück in die App führen.",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Erste öffentliche Nib-Version: eine Installation, eine Anmeldung, alle Modelle.",
      "Anmeldung mit einem Nib-Konto; die Bestätigungsseite öffnet sich mit dem Code.",
      "Der Composer zeigt Tarif, Restguthaben und Nutzung für Tag/Woche/Monat.",
      "Ankündigungen der Administration erscheinen über den Aufgabenergebnissen.",
      "Ein Windows-x64-Installer und Linux AppImage/deb sind veröffentlicht.",
    ],
  },
];
