import type { ChangelogEntry } from "./changelog.js";

export const deEntries: ChangelogEntry[] = [
  {
    version: "0.22.44",
    date: "2026-11-10",
    highlights: [
      "Nib synchronisiert neue Modelle beim Start und beim Aktualisieren automatisch und behält deine Auswahl und eigenen Limits bei.",
      "Modell-Routing-Aliasse sowie veröffentlichte Kontext- und Ausgabelimits wurden korrigiert, einschließlich Extra-Bereitstellungen und kanonischer Modellnamen.",
    ],
  },

{
    version: "0.22.43",
    date: "2026-11-08",
    highlights: [
      "Feedback-Korrekturen: Die Beschriftung des 全自动-Berechtigungs-Chips erscheint jetzt ebenfalls in der Warnfarbe; die Fernsteuerung startet mit der App, statt nach jedem Neustart manuell aktiviert werden zu müssen.",
    ],
  },

{
    version: "0.22.42",
    date: "2026-11-07",
    highlights: [
      "Feedback-Korrekturen: der Pairing-Status steht in derselben Zeile wie seine Beschriftung, der 全自动-Chip ist so deutlich wie die Kauf-Pille, die Guthaben- und Plan-Links oeffnen wieder den Browser, und vom Handy gesteuerte Turns bleiben am Desktop still.",
    ],
  },

{
    version: "0.22.41",
    date: "2026-11-07",
    highlights: [
      "Korrekturen zum Feedback dieser Woche: der Auto-Berechtigungs-Chip zeigt seine Warnfarbe, der Guthaben-Aufstocken-Eintrag oeffnet die Abrechnungsseite, Testkonten erhalten einen Kauf-Button im Guthaben-Popover, und die Einstellungen zeigen den Live-Pairing-Status.",
    ],
  },

{
    version: "0.22.40",
    date: "2026-11-07",
    highlights: [
      "Ruhigere Remote-Sitzungen: Vom Handy gesendete Nachrichten lasen den Desktop nicht mehr klingeln, der QR-Ausklapp verdeckt keine Menue-Schaltflaechen mehr, und Kaufoptionen sitzen direkt im Konto-Menue.",
    ],
  },

{
    version: "0.22.39",
    date: "2026-11-06",
    highlights: [
      "Der Kontext-Ring sinkt sofort nach dem Komprimieren, der Remote-Composer startet neue Chats mit dem angezeigten Modell, und der Text im Dunkelmodus ist nicht mehr reinweiss.",
    ],
  },

{
    version: "0.22.38",
    date: "2026-11-06",
    highlights: [
      "Eine verlorene Handy-Verbindung erholt sich von selbst: Das Pairing-Token wird vor jeder neuen Verbindung neu gelesen, und ein abgelehnter Handshake wartet eine Minute, statt das Relay zu bombardieren.",
    ],
  },

{
    version: "0.22.37",
    date: "2026-11-05",
    highlights: [
      "Im Browser erstellte Sitzungen lassen sich loeschen und bekommen ihren Titel aus der ersten Nachricht; ein neuer Chat startet mit dem Modell, das der Composer anzeigt.",
    ],
  },

{
    version: "0.22.36",
    date: "2026-11-05",
    highlights: [
      "Eine im Browser ueber das + neben einem Projekt erstellte Sitzung oeffnet jetzt in genau diesem Projekt, und die Web-Seitenleiste zeigt deine echten Projektnamen statt roher remote-project-Schluessel.",
      "Die App erneuert deine Nib-Sitzung im Hintergrund: Du bleibst ueber die 24 Stunden hinaus angemeldet, und alle Oberflaechen - Kontomenue, Guthaben-Chip, Modellliste - zeigen nach einer Netzwerkstoerung denselben Zustand.",
    ],
  },

{
    version: "0.22.35",
    date: "2026-11-05",
    highlights: [
      "Die Web-Fernsteuerung liest jetzt deine echte Modellliste, und Modell-, Berechtigungs-, Modus- und Denklevel-Aenderungen aus dem Browser greifen tatsaechlich - beide Host-Befehle waren defekt.",
      "Eine steckengebliebene Relay-Verbindung wird nach zwei verpassten Heartbeats getrennt und in Sekunden neu verbunden, statt stumm weiterzulaufen.",
    ],
  },

{
    version: "0.22.34",
    date: "2026-11-04",
    highlights: [
      "Anhang-Links und -Chips in Host-Verbindungssitzungen öffnen jetzt, und hochgeladene Anhangkopien überleben Host-Neustarts.",
    ],
  },
{
    version: "0.22.33",
    date: "2026-11-04",
    highlights: [
      "Anhang-Chips öffnen jetzt auch in Sitzungen, die ohne Projektbindung auf einem verbundenen Host laufen, und der Pro-/Pro-Extra-Umschalter im Guthaben-Popover ist im Dunkelmodus lesbar.",
    ],
  },
{
    version: "0.22.32",
    date: "2026-11-03",
    highlights: [
      "Die Anmeldung begrüßt Sie namentlich, das Guthaben-Popover ist im Dunkelmodus korrekt lesbar, -extra-Modelle übernehmen die Denkstufen des Basismodells und erhalten ein „Extra“-Label, und Anhang-Chips in Host-Verbindungssitzungen öffnen wieder.",
    ],
  },
{
    version: "0.22.31",
    date: "2026-11-03",
    highlights: [
      "Die App startet nicht mehr mit einem leeren React-Fehlerbildschirm: Ein View-State-Hook im Credits-Popover wurde nach einem fruehen Return deklariert und brachte die Hook-Reihenfolge durcheinander (React #310).",
    ],
  },

{
    version: "0.22.30",
    date: "2026-11-03",
    highlights: [
      "Datei-Chips in Remote-Sitzungen oeffnen sich wieder: Die Dateiansicht uebermittelt die Sitzungs-ID an den Host, sodass Lesezeichen innerhalb des autorisierten Scratch-Bereichs der Sitzung aufgeloest werden.",
      "Gateway--Extra-Modelle zeigen jetzt ihr echtes Kontextfenster und ihre Faehigkeiten - der Katalog uebernimmt den veroeffentlichten Datensatz des Basismodells fuer -extra-Bereitstellungen.",
      "Das Kontomenue begruesst dich (Hi <Name>, I am Nib.), listet die enthaltene Extra-Zuteilung unter deinem Plan, und der Credits-Popover im Eingabefeld erhaelt Pro / Pro Extra-Registerkarten.",
    ],
  },

{
    version: "0.22.29",
    date: "2026-11-03",
    highlights: [
      "Chips für in einer Sitzung hochgeladene Dateien öffnen nun überall: Wenn die lokale Suche nichts findet, fragt die Dateiansicht den Host ab, der die Werkzeuge der Sitzung ausgeführt hat, und liest die Kopie im privaten Scratch-Verzeichnis dieser Sitzung.",
    ],
  },
{
    version: "0.22.28",
    date: "2026-11-03",
    highlights: [
      "Ein Klick auf einen hochgeladenen Anhang in einer Remote-Sitzung zeigt nun die Host-Kopie in der Vorschau: Die Dateiansicht löst Remote-Scratch-Pfade auf dem besitzenden Host auf und autorisiert nur dieses eine Sitzungsverzeichnis.",
    ],
  },

{
    version: "0.22.27",
    date: "2026-11-03",
    highlights: [
      "Mit dem Plus-Button des Composers hinzugefügte Dateien nutzen jetzt den strukturierten Anhangskanal - der Host einer Remote-Sitzung erhält die echte Datei und der Prompt verweist auf die entfernte Kopie statt auf einen nie lesbaren Desktop-Pfad.",
    ],
  },

{
    version: "0.22.26",
    date: "2026-11-03",
    highlights: [
      "Jede Anhang-Upload-Entscheidung wird jetzt im Desktop-Protokoll vermerkt, und der Prompt löst die Remote-Bindung direkt aus dem Sitzungsspeicher auf — der letzte stille Fallback-Pfad ist geschlossen.",
    ],
  },

{
    version: "0.22.25",
    date: "2026-11-02",
    highlights: [
      "Anhänge in reinen Remote-Sitzungen (der Agent läuft auf dem Host) werden jetzt vor dem Zug auf den Host hochgeladen; der Prompttext verweist auf die entfernte Kopie.",
      "Die Zuordnung Sitzung zu Ausführungshost übersteht einen Desktop-Neustart; nach einem Upgrade folgen Anhänge weiter dem Host der Werkzeuge.",
    ],
  },

{
    version: "0.22.24",
    date: "2026-11-02",
    highlights: [
      "Anhänge von Sitzungen, deren Werkzeuge auf einem entfernten Host laufen (einschließlich lokaler Desktop-Sitzungen, die mit dem Host gepaart sind), werden jetzt automatisch dorthin hochgeladen; das Modell liest die echte Datei statt eines unbrauchbaren lokalen Pfads.",
    ],
  },

{
    version: "0.22.23",
    date: "2026-11-02",
    highlights: [
      "Anhänge werden in einer mit einem entfernten Host verbundenen Sitzung jetzt auch ohne Projektordner hochgeladen, statt einen unlesbaren lokalen Pfad zu senden.",
      "Remote-Anhangskopien spiegeln das Desktop-Speicherlayout exakt — gleiche Sitzung, Verzeichnis- und Dateinamen — Remote-Werkzeuge finden sie genau dort, wo der lokale Pfad zeigt.",
      "Der Composer zeigt keinen dauerhaften Upload-Hinweis mehr; Uploads bleiben stumm, außer ein Zug schlägt fehl.",
    ],
  },

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
