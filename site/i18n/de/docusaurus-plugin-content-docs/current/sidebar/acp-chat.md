# ACP Chat-Nutzung

## Funktionalität

Mit ACP Chat können Sie mit einem konfigurierten ACP-Backend kommunizieren. Der Gesprächskontext wird aus dem Zotero-Element, das Sie gerade betrachten, oder dem Paper im Reader bezogen.

## Einsatzbereiche

- **Literaturfragen**: Stellen Sie Fragen zum aktuell gelesenen Paper, erhalten Sie Erklärungen und Zusammenfassungen
- **Schreibunterstützung**: Erhalten Sie Vorschläge während des Schreibprozesses
- **Schnellsuche**: Rufen Sie schnell Schlüsselinformationen zu einem bestimmten Paper ab
- **Stapelverarbeitung**: Führen Sie Batch-Analysen für mehrere Elemente in einer Literaturliste durch

## Oberflächenlayout

Das ACP Chat-Panel besteht aus folgenden Bereichen:

![ACP Chat-Panel](/img/docs/sidebar/acp-chat.png)

```
┌──────────────────────────────────────────┐
│  Banner                                  │
│  Backend ▼  |  Session ▼  | [Connect] [＋] │
│  Status:   ● Connection | ● MCP | ● HostBridge  │
├──────────────────────────────────────────┤
│  ← Session Drawer  │  Transcript View  │  Details →  │
│                    │  [Toggle Plain/Bubble]    │
│  Backend A         │  Conversation messages... │
│  ├─ Session 1      │  Plan Component           │
│  └─ Session 2      │  Prompt Component         │
│  Backend B         │  Reply Area               │
│  └─ Session 3      │  Text input + Send/Cancel │
│                    │  Mode ▼ | Model ▼ | Reasoning ▼│
│                    │  ⭕ Usage 12.3k/200k   │
└──────────────────────────────────────────┘
```

## Banner

Das Banner befindet sich oben im Panel und bietet die zentralen Steuerungsfunktionen:

### Backend-Auswahl

Ein Dropdown listet alle konfigurierten Backends auf, jeweils mit einem Status-Suffix (Connecting/Connected/Disconnected). Beim Wechsel des Backends wird automatisch zur Session dieses Backends gewechselt.

### Session-Auswahl

Ein Dropdown zeigt die letzten 8 Sessions (nach Zeit sortiert); durch Auswahl wechseln Sie zur entsprechenden Session. Wenn mehr als 8 vorhanden sind, erscheint unten „Show more..."; ein Klick darauf öffnet das Session-Panel mit der vollständigen Liste.

### Verbindungssteuerung

- **Verbinden/Trennen-Schaltfläche**: Manuelle Verwaltung des Verbindungsstatus des aktuellen Backends
- **Authentifizierungs-Schaltfläche**: Wird angezeigt, wenn das Backend eine Authentifizierung erfordert
- **Neue Session (＋)**: Erstellt eine neue Session auf dem aktuellen Backend

### Statusanzeigen

Die rechte Seite des Banners zeigt drei Statusanzeigen:

| Anzeige | Beschreibung |
|---------|-------------|
| ● Connection | Verbindungsstatus mit dem ACP-Backend (grün=Connected/grau=Disconnected/gelb=Connecting) |
| ● MCP | MCP-Dienstverfügbarkeit |
| ● Host Bridge | Zotero Host Bridge-Verbindungsstatus (siehe unten) |

### Host Bridge-Status

Host Bridge ist ein interner Bridge-Kanal zwischen dem Zotero-Plugin und dem Backend. Er ist dafür zuständig, den aktuellen Zotero-Kontext (ausgewählte Elemente, Paper im Reader, Bibliotheksdaten usw.) an das Backend zu übergeben, sodass die KI auf Basis Ihrer tatsächlichen Zotero-Daten arbeiten kann.

Host Bridge kommuniziert über das `zotero-bridge`-CLI-Tool; das Plugin verwaltet dessen Lebenszyklus automatisch im Hintergrund.

| Status | Bedeutung |
|--------|-----------|
| Grün ● | Host Bridge ist verbunden; das Backend kann auf den Zotero-Kontext zugreifen |
| Gelb ● | Verbindung wird hergestellt oder wiederhergestellt |
| Grau ● | Host Bridge ist nicht verfügbar (nicht installiert oder nicht gestartet); das Backend kann keinen Zotero-Kontext abrufen |
| Ausgeblendet | Host Bridge wird derzeit nicht benötigt (z.B. Backend unterstützt ihn nicht oder Kontextfunktionen sind nicht aktiviert) |

Wenn Host Bridge nicht verfügbar ist, funktioniert ACP Chat weiterhin normal, aber die KI kann nicht auf Informationen über das aktuell angezeigte Paper als Kontext zugreifen.

## Session-Panel (links)

Das linke Panel zeigt alle bisherigen Sessions, gruppiert nach Backend. Jeder Session-Eintrag zeigt einen Titel und die letzte Aktivitätszeit.

- **Session wechseln**: Klicken Sie auf eine Session in der Liste, um sie zu laden
- **Neue Session**: Bedienung über den oberen Bereich des Panels oder das Banner

## Transcript-Ansicht

### Gesprächsnachrichten

Gesprächsnachrichten unterstützen Markdown-Rendering, einschließlich:

- **Codeblöcke**: Mit Syntaxhervorhebung und Kopier-Schaltfläche
- **Mathematische Formeln**: LaTeX-Formeln, gerendert mit KaTeX
- **Listen, Tabellen, Links** und andere Standard-Markdown-Elemente

### Tool-Aufrufe

Wenn die KI ein Tool aufruft, wird ein Tool-Aufruf-Eintrag im Transcript angezeigt:

- Tool-Namens-Badge
- Zusammenfassung der Eingabeparameter
- Ausführungsstatus-LED (waiting/in-progress/completed/failed)
- Im Bubble-Modus werden aufeinanderfolgende Tool-Aufrufe automatisch zu einer „Tool-Aktivitätsgruppe" zusammengefasst

### Denkprozess

Der Denkprozess der KI wird als separater „Thinking"-Block angezeigt, der sich von der eigentlichen Antwort abhebt.

### Anzeigemodus-Umschaltung

Die Umschalt-Schaltfläche in der oberen rechten Ecke ermöglicht das Umschalten zwischen zwei Modi:

| Modus | Beschreibung |
|-------|-------------|
| **Plain** | Nachrichten sind links mit einem farbigen Rand je nach Rolle eingefärbt, geeignet zum Durchsuchen langer Unterhaltungen |
| **Bubble** | Nachrichten werden in Blasenform angezeigt, aufeinanderfolgende Tool-Aufrufe werden automatisch gruppiert, geeignet zum Lesen |

### Plan-Komponente

Wenn eine Unterhaltung einen mehrstufigen Plan enthält, wird ein Plan-Fortschrittsbalken über dem Transcript angezeigt, der abgeschlossene, laufende und ausstehende Schritte markiert.

### Prompt-Komponente

Die Prompt-Komponente wird angezeigt, wenn Benutzerinteraktion erforderlich ist:

- **Berechtigungsanfragen**: Wenn das Backend Zotero-Zugriffsberechtigungen benötigt, werden die Anfrage-Details und Genehmigungsschaltflächen angezeigt
- **Verbindungshinweis**: Bei getrennter Verbindung wird eine Empfehlung zur Wiederverbindung angezeigt
- **Fehlerhinweis**: Zeigt Fehlerinformationen und Wiederherstellungsaktionen an

## Antwortbereich

### Texteingabe

- **Mehrzeiliges Textfeld**: Unterstützt die Eingabe von Langtext
- **Enter zum Senden**: Drücken Sie Enter, um eine Nachricht zu senden
- **Shift+Enter für Zeilenumbruch**: Fügt einen Zeilenumbruch ein
- **Antwort-Verlauf**: Drücken Sie die Aufwärts-/Abwärts-Pfeiltasten, um gesendete Nachrichten durchzublättern

### Ausführungsmodus

Über dem Antwortbereich können Sie folgendes auswählen:

| Option | Beschreibung | Verfügbare Werte |
|--------|-------------|-----------------|
| **Mode** | Ausführungsmodus | Vom Backend definiert |
| **Model** | KI-Modell | Liste der vom Backend unterstützten Modelle |
| **Reasoning Effort** | Denkintensität | Low/Medium/High (sofern vom Backend unterstützt) |

### Nutzungsanzeige

Eine kreisförmige Nutzungsanzeige befindet sich in der unteren rechten Ecke des Antwortbereichs:

- **Äußerer Ring**: Prozentsatz der aktuellen Session-Token-Nutzung im Verhältnis zum Limit
- **Text**: `Used k / Limit k`
- Die Farbe ändert sich mit dem Nutzungsgrad (Normal → Warning → Critical)

### Tastenkürzel-Hinweise

Hinweise zu Tastenkürzeln werden innerhalb des Eingabefelds angezeigt.

## Details-Panel (rechts)

Das rechte Panel zeigt detaillierte Informationen zur aktuellen Session:

| Bereich | Inhalt |
|---------|--------|
| **Session-Info** | Session-ID, Erstellungszeit, letzte Aktivitätszeit |
| **Backend-Info** | Backend-Typ, Adresse, Modell |
| **Workspace-Pfad** | Dateipfad des Session-Workspaces |
| **Diagnose** | Debug- und Diagnosedaten |

## Bibliothekskontext vs. Reader-Kontext

ACP Chat unterstützt zwei Kontextmodi; das Plugin erkennt den aktuellen Kontexttyp automatisch und übergibt ihn an das Backend:

| Modus | Beschreibung | Einsatzbereiche |
|-------|-------------|----------------|
| **Bibliothekskontext** | Basierend auf den aktuell in der Zotero-Elementliste ausgewählten Elementen | Schnelle Referenz beim Durchsuchen der Bibliothek |
| **Reader-Kontext** | Basierend auf dem Volltext des aktuell im Zotero Reader geöffneten Papers | Kontextverständnis beim intensiven Lesen |

## Session-Verwaltung

- Der Gesprächsverlauf wird automatisch persistent gespeichert
- Mehrere Sessions pro Backend werden unabhängig verwaltet
- Frühere Sessions können im Dashboard oder in der Seitenleiste eingesehen werden
- Eine nach Backend gruppierte Session-Liste wird unterstützt

## Hinweise

- Zuerst muss ein [ACP-Backend](../backends/acp) konfiguriert werden
- Unterhaltungen auf verschiedenen ACP-Backends beeinflussen sich nicht gegenseitig
- Unterhaltungen werden mit Zotero-Elementen verknüpft, um ein späteres Nachschlagen zu erleichtern
