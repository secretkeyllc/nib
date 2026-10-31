import type { ChangelogEntry } from "./changelog.js";

export const deEntries: ChangelogEntry[] = [

  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "Die Fernsteuerungs-Kopplung verbindet sich jetzt tatsächlich: Der Desktop registrierte sich unter einer zufälligen sid statt der im QR-Code, sodass jeder Telefon-Versuch als unbekannte Kopplung abgelehnt wurde.",
    ],
  },


  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "Der Kopplungslink ist jetzt pro Rechner stabil: einmal scannen, und das Telefon funktioniert über Stop/Start-Zyklen und App-Neustarts hinweg.",
      "Eine Aktion „Link rotieren“ erzeugt bei Bedarf einen neuen Link und macht alle bisherigen QR-Codes ungültig.",
      "Das Kontomenü enthält die Kopplung: ein Tipp klappt den QR-Code direkt auf.",
      "Kopplungen können automatisch mit der App starten, damit das Telefon jederzeit verbinden kann.",
      "Das Arbeitsbereich-Maskottchen erhält die neue 16:9-Grafik für beide Themes, und jede Begrüßung im leeren Arbeitsbereich beginnt mit der Signaturzeile „I am Nib, …“.",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Steuere diesen Desktop vom Handy oder einem beliebigen Browser: Einstellungen → Über startet eine Kopplung, die nur dein eigenes Konto öffnen kann.",
      "Die Webansicht spiegelt Sitzungsliste und Live-Verlauf, sendet Prompts und beantwortet Freigabe-Karten.",
      "Eine Kopplung lebt nur, während sie läuft — der Link rotiert bei jedem Start und endet mit der Verbindung.",
      "Auch das Kontomenü enthält die Kopplung: ein Tipp klappt den QR-Code direkt auf.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "Remote-Hosts lassen sich wieder auf Rechnern installieren, deren ~/.nib die übliche 0755-Berechtigung hat.",
      "Jedes Kontingentfenster zeigt jetzt an, wann es zurückgesetzt wird, im Guthaben-Chip und in der Konsole.",
      "Der Versions-Chip zeigt die installierte statt der ausstehenden Version.",
      "Einstellungen -> Info zeigt die Produktmarke über dem Namen.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "Der Windows-on-Arm-Sidecar benötigt kein Visual C++ Redistributable mehr.",
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
];
