# Einstellungen

Die Zotero-Agents-Einstellungen befinden sich unter **Zotero → Einstellungen → Zotero Agents** (Windows/Linux) oder **Zotero → Preferences → Zotero Agents** (macOS).

## Workflow-Einstellungen

### Workflow-Verzeichnis

- **Pfad**: Benutzerdefiniertes Verzeichnis zum Speichern von Workflows
- **Standard-Speicherort**: `<Zotero Data>/zotero-agents/data/workflows`
- **Workflows durchsuchen**: Klicken Sie auf die Schaltfläche, um das Verzeichnis erneut zu durchsuchen und alle Workflows zu laden

### Skill-Verzeichnis

- **Pfad**: Benutzerdefiniertes Verzeichnis zum Speichern von Skill-Paketen
- **Durchsuchen**: Klicken Sie auf die Schaltfläche, um das Verzeichnis zu scannen und Skills zu laden

### Offizielle Workflow-Pakete

Offizielle Workflows werden über separate Content-Pakete vertrieben, entkoppelt vom Plugin selbst.

![Workflow-Einstellungen-Seite](/img/docs/preferences_workflow.png)

| Einstellung | Typ | Beschreibung |
|-------------|-----|-------------|
| **Install Official Workflow Packages** | Schaltfläche | Das neueste offizielle Paket von GitHub / Gitee herunterladen und installieren |
| **Check for Updates** | Schaltfläche | Prüfen, ob eine neue Version remote verfügbar ist |
| **Status** | Text | Zeigt die aktuell installierte Paketversion und Kanalinformationen an |

![Inhalt des offiziellen Workflow-Pakets](/img/docs/preferences_official-workflow-contents.png)

#### Update-Kanäle

Sie können aus drei Update-Kanälen wählen:

| Kanal | Beschreibung |
|-------|-------------|
| **stable** | Stabile Version (empfohlen) |
| **beta** | Beta-Version, enthält kommende Funktionen |
| **dev** | Entwicklungsversion, enthält die neuesten experimentellen Änderungen |

Nach dem Wechsel des Kanals klicken Sie auf **Check for Updates**, um das neueste Paket für diesen Kanal zu erhalten.

### Laufzeiteinstellungen

- **Skill Run Feedback aktivieren**: Wenn aktiviert, können Skill-Runs Markdown-Feedback-Sidecars schreiben, die vom Dashboard Skill-Feedback-Panel gesammelt werden

## Host Bridge

Ein eingebetteter HTTP-Service für den Zugriff externer KI-Tools und der CLI auf die Zotero-Bibliothek. Details siehe [Host Bridge](backends/host-bridge).

| Einstellung | Typ | Beschreibung |
|-------------|-----|-------------|
| **Enable MCP Server** | boolean | Zusätzlich die MCP-Protokollschnittstelle bereitstellen |
| **Disable Write Approval** | boolean | Gefährlich: Alle Schreib-Genehmigungen umgehen |
| **Enable LAN Access** | boolean | LAN-Zugriff erlauben |
| **Fixed Port** | boolean | Festen Port anstelle eines zufälligen verwenden |
| **Port Number** | number | Fester Port-Wert (Standard 26570) |
| **LAN IP** | string | Beworbene IP manuell angeben (leer lassen für automatische Erkennung) |

![Host Bridge Einstellungsseite](/img/docs/preferences_host-bridge.png)

Aktions-Schaltflächen:

- **Start/Show Endpoint**: Den Dienst starten und die Endpoint-URL anzeigen
- **Rotate Token**: Das Sitzungstoken rotieren
- **Create/Rotate Master Token**: Ein persistentes Token generieren
- **Copy Master Token**: In die Zwischenablage kopieren
- **Copy Remote CLI Profile**: Die Remote-Verbindungskonfiguration abrufen
- **Install CLI**: `zotero-bridge` mit einem Klick installieren

![Host Bridge Gefährliche Aktionen Bereich erweitert](/img/docs/preferences_host-bridge_expand.png)

## SkillRunner Lokales Backend

> ⚠️ Dieser Modus ist nur für Benutzer geeignet, die mit der Installation von Agent-Tools völlig unvertraut sind und Docker nicht nutzen können. Wenn Sie bereits einen ACP-Agenten haben oder Docker verwenden können, bevorzugen Sie bitte das [ACP-Backend](backends/acp) oder den [Docker-bereitgestellten Skill-Runner](backends/skill-runner#recommended-docker-persistent-deployment).

Der lokale Skill-Runner wird zusammen mit dem Plugin gestartet und gestoppt — das Schließen von Zotero beendet alle Aufgaben. Funktionen der Laufzeitverwaltung:

| Funktion | Beschreibung |
|----------|-------------|
| **One-click Deploy** | Die neueste Version der Skill-Runner-Laufzeitumgebung herunterladen und installieren |
| **Start** | Den lokalen Skill-Runner-Prozess starten |
| **Stop** | Den laufenden lokalen Skill-Runner stoppen |
| **Uninstall** | Die installierten Laufzeitdateien entfernen |
| **Open Management UI** | Die Backend-Verwaltungsoberfläche im Plugin öffnen |
| **Open Skills Folder** | Das Verzeichnis öffnen, in dem Skill-Dateien gespeichert sind |
| **Refresh Model Cache** | Den Modelllisten-Cache des Backends aktualisieren |
| **Open Debug Console** | Die Backend-Log-Ausgabe anzeigen |

![SkillRunner Lokales Backend Einstellungsseite](/img/docs/preferences_skillrunner-local-backend.png)

## Backend Manager

Alle Backend-Profile verwalten:

- Gruppiert nach Anbieter (SkillRunner, ACP, Generic HTTP)
- Backends hinzufügen/bearbeiten/löschen
- Jedes Backend kann konfiguriert werden mit: ID, Base URL, Bearer Token, Timeout

## WebDAV Sync

Geräteübergreifende Synchronisierungslösung für das Synthesis Workbench als Ersatz für das eingestellte Git Sync. Details siehe [WebDAV Sync](synthesis/webdav-sync).

| Einstellung | Typ | Standard | Beschreibung |
|-------------|-----|----------|-------------|
| **Enable WebDAV Sync** | boolean | `false` | Hauptschalter |
| **Base URL** | string | `""` | WebDAV-Serveradresse |
| **Remote Path** | string | `"zotero-agents"` | Remote-Verzeichnispfad |
| **Username** | string | `""` | WebDAV-Benutzername |
| **Password/Token** | verschlüsselt | `""` | Passwort oder App-Token (AES-256-GCM-verschlüsselt) |
| **Auto Sync** | boolean | `false` | Synchronisierung nach jeder Änderung automatisch auslösen |
| **Auto Retry** | boolean | `false` | Bei Fehler automatisch wiederholen |

Aktions-Schaltflächen: Save Settings, Save Credential, Test Connection.

![WebDAV Sync Einstellungsseite](/img/docs/preferences_WebDAV-sync.png)

## Laufzeitdaten

Zeigt das Persistenz-Stammverzeichnis, die Laufzeitnutzung und Integritätsdiagnosen an:

- **Persistenz-Stammverzeichnis**: `<Zotero Data>/zotero-agents/data/`
- **Synthesis Canonical Store**: Lokale SQLite + persistente Pakete
- **Verzeichnisgrößen**: data/, cache/, logs/, tmp/ usw.
- **Diagnose-Panel**: Erkennt Dateisystemprobleme (z.B. nicht bereinigte WAL-Dateien)

Hinweis: Der Synthesis Canonical Store und die Zustandsdatenbanken dienen nur der Diagnose und können hier nicht bereinigt werden.

![Laufzeitdaten und Persistenzverwaltungsseite](/img/docs/preferences_storage-and-persistence.png)

## Allgemeine Optionen

- **Default Backend**: Die zu verwendende Standard-Backend-Instanz auswählen
- **Auto-start Local Backend**: Skill-Runner automatisch beim Start von Zotero starten
- **Log Level**: Den Protokollierungslevel festlegen
- **Enable Built-in Markdown Reader**: Wenn aktiviert, werden `.md`-Anhänge durch Doppelklick im integrierten Reader geöffnet; wenn deaktiviert, wird der Standard-Öffner des Systems wiederhergestellt (standardmäßig aktiviert)

## Einstellungsnavigationspfad

```
Zotero → Einstellungen → Zotero Agents
├── Workflow-Einstellungen
│   ├── Workflow-Verzeichnis
│   ├── Skill-Verzeichnis
│   ├── Offizielle Workflow-Pakete
│   └── Laufzeiteinstellungen
├── Host Bridge
│   ├── Dienst Start/Stop
│   ├── Netzwerk & Port
│   └── Token-Verwaltung
├── SkillRunner Lokales Backend
├── Backend Manager
├── WebDAV Sync
├── Laufzeitdaten
└── Allgemeine Optionen
```
