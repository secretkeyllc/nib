import type { ChangelogEntry } from "./changelog.js";

export const deEntries: ChangelogEntry[] = [
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
