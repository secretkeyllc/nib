import type { ChangelogEntry } from "./changelog.js";

export const deEntries: ChangelogEntry[] = [
{
    version: "0.22.22",
    date: "2026-11-02",
    highlights: [
      "Anhänge werden im Modus mit lokalem Agent und entfernten Werkzeugen jetzt vor Sitzungsbeginn in das private Sitzungsverzeichnis des gewählten entfernten Hosts hochgeladen.",
      "Remote Read, Glob und Grep können die hochgeladenen Kopien lesen; Schreibvorgänge bleiben innerhalb der Projektgrenzen.",
      "Pro Datei gelten 50 MiB Grenze und SHA-256-Prüfung; der Composer weist darauf hin, dass Anhänge auf dem entfernten Host verbleiben.",
    ],
  },

{
    version: "0.22.21",
    date: "2026-11-01",
    highlights: [
      "Bereits angemeldete Nib-Konten laden nach dem Upgrade die vollständige Modellliste, ohne eine erneute Anmeldung zu verlangen.",
      "Die veröffentlichten Kontext- und Ausgabelimits des Gateways gelten in Composer und Laufzeit, während gespeicherte Auswahlen und manuelle Überschreibungen erhalten bleiben.",
      "Die Modellerkennung wird nach vorübergehenden Fehlern wiederholt und ignoriert veraltete Ergebnisse nach Abmeldung, erneuter Authentifizierung oder Plugin-Neuladen.",
    ],
  },

{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "Nach der Anmeldung bei Nib wird jetzt die vollständige Gateway-Modellliste des Kontos mit den veröffentlichten Kontext- und Ausgabelimits geladen.",
      "Eine erneute Anmeldung behält die gespeicherte Modellauswahl und manuelle Limits und aktualisiert die veröffentlichten Werte.",
      "Ab- und wieder anmelden stellt die Modell-Metadaten wieder her; eine fehlgeschlagene Modellabfrage blockiert eine gültige Anmeldung nie.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "Der Klick auf die Nib-Dienstzeile folgt dem Zustand: abgemeldet führt ein Klick zur Anmeldung, angemeldet öffnet er den Editor.",
      "Das Wechseln des API-Formats in der Nib-Zeile wird jetzt korrekt gespeichert — kein Zurücksetzen auf Chat Completions mehr.",
      "Das Modellmenü des Composers zeigt genau die in der Nib-Zeile aktivierten Modelle, nicht den gesamten Gateway-Katalog.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "Der Nib-Dienst ist ein vollwertiger Eintrag in der Modellliste: Klick auf die Zeile öffnet den Editor, beschriftet als „Nib-Konto“ mit dem App-Zeichen.",
      "Die Modellauswahl in der Nib-Zeile wird zuverlässig gespeichert — die erste Öffnung nach der Anmeldung wählt alle aufrufbaren Modelle.",
      "Bestehende Nib-Zeilen werden beim ersten Start nach dem Update auf die api.nib.am-Adresse migriert.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "Der Nib-Dienst in der Modellliste ist jetzt wie jeder andere Endpunkt editierbar: API-Format, Modelle und modellbezogene Einstellungen.",
      "Der Schlüssel, mit dem sich die Desktop-App anmeldet, heißt in der Konsole „Nib“ und kann nicht umbenannt oder gelöscht werden.",
      "Behoben: die gemeldete Versionsnummer hing einen Release hinterher; das Start-Wortmarke liest sich „I am Nib“.",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "Eine abgelaufene Anmeldung wirkt jetzt wie abgemeldet: der gespeicherte Nib-Schlüssel wird entfernt, die Modellauswahl zeigt keine toten Einträge mehr.",
      "Der Remote-Control-Eintrag in den Einstellungen zeigt Titel und Experimental-Badge wieder an.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "Der Web-Controller erhält die Arbeitsbereich-Grundlagen: Sitzungen nach Projekt gruppiert (einklappbar), Modellwahl und Modusumschaltung am Eingabefeld, begrenzte Verlaufslesevorgänge und Sitzungstitel in einer Zeile.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "Der Web-Controller lädt den Arbeitsbereich auf 0.22.13-Desktops jetzt (das Sitzungsdetail-Lesen verwendete den falschen Argumentnamen) und lädt ihn automatisch neu, sobald sich der Desktop neu verbindet.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "Der Web-Controller lädt jetzt den echten Arbeitsbereich: Remote-Befehle entpacken denselben Ergebnisumschlag wie der Renderer, sodass Sitzungen, Verläufe und Prompts nicht mehr leer ankommen.",
    ],
  },


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
