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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_workflow.webp" alt="Workflow-Einstellungen-Seite" title="Workflow-Einstellungen-Seite" loading="lazy" /><figcaption>Workflow-Einstellungen-Seite</figcaption></figure>

| Einstellung | Typ | Beschreibung |
|-------------|-----|-------------|
| **Install Official Workflow Packages** | Schaltfläche | Das neueste offizielle Paket von GitHub / Gitee herunterladen und installieren |
| **Check for Updates** | Schaltfläche | Prüfen, ob eine neue Version remote verfügbar ist |
| **Status** | Text | Zeigt die aktuell installierte Paketversion und Kanalinformationen an |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_official-workflow-contents.webp" alt="Inhalt des offiziellen Workflow-Pakets" title="Inhalt des offiziellen Workflow-Pakets" loading="lazy" /><figcaption>Inhalt des offiziellen Workflow-Pakets</figcaption></figure>

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

Ein eingebetteter HTTP-Service für den Zugriff externer KI-Tools und der CLI auf die Zotero-Bibliothek. Details siehe [Host Bridge](#doc/backends%2Fhost-bridge).

| Einstellung | Typ | Beschreibung |
|-------------|-----|-------------|
| **Enable MCP Server** | boolean | Zusätzlich die MCP-Protokollschnittstelle bereitstellen |
| **Disable Write Approval** | boolean | Gefährlich: Alle Schreib-Genehmigungen umgehen |
| **Enable LAN Access** | boolean | LAN-Zugriff erlauben |
| **Fixed Port** | boolean | Festen Port anstelle eines zufälligen verwenden |
| **Port Number** | number | Fester Port-Wert (Standard 26570) |
| **LAN IP** | string | Beworbene IP manuell angeben (leer lassen für automatische Erkennung) |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge.webp" alt="Host Bridge Einstellungsseite" title="Host Bridge Einstellungsseite" loading="lazy" /><figcaption>Host Bridge Einstellungsseite</figcaption></figure>

Aktions-Schaltflächen:

- **Start/Show Endpoint**: Den Dienst starten und die Endpoint-URL anzeigen
- **Rotate Token**: Das Sitzungstoken rotieren
- **Create/Rotate Master Token**: Ein persistentes Token generieren
- **Copy Master Token**: In die Zwischenablage kopieren
- **Copy Remote CLI Profile**: Die Remote-Verbindungskonfiguration abrufen
- **Install CLI**: `zotero-bridge` mit einem Klick installieren

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_host-bridge_expand.webp" alt="Host Bridge Gefährliche Aktionen Bereich erweitert" title="Host Bridge Gefährliche Aktionen Bereich erweitert" loading="lazy" /><figcaption>Host Bridge Gefährliche Aktionen Bereich erweitert</figcaption></figure>

## SkillRunner Lokales Backend

> ⚠️ Dieser Modus ist nur für Benutzer geeignet, die mit der Installation von Agent-Tools völlig unvertraut sind und Docker nicht nutzen können. Wenn Sie bereits einen ACP-Agenten haben oder Docker verwenden können, bevorzugen Sie bitte das [ACP-Backend](#doc/backends%2Facp) oder den [Docker-bereitgestellten Skill-Runner](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment).

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_skillrunner-local-backend.webp" alt="SkillRunner Lokales Backend Einstellungsseite" title="SkillRunner Lokales Backend Einstellungsseite" loading="lazy" /><figcaption>SkillRunner Lokales Backend Einstellungsseite</figcaption></figure>

## Backend Manager

Alle Backend-Profile verwalten:

- Gruppiert nach Anbieter (SkillRunner, ACP, Generic HTTP)
- Backends hinzufügen/bearbeiten/löschen
- Jedes Backend kann konfiguriert werden mit: ID, Base URL, Bearer Token, Timeout

## WebDAV Sync

Geräteübergreifende Synchronisierungslösung für das Synthesis Workbench als Ersatz für das eingestellte Git Sync. Details siehe [WebDAV Sync](#doc/synthesis%2Fwebdav-sync).

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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_WebDAV-sync.webp" alt="WebDAV Sync Einstellungsseite" title="WebDAV Sync Einstellungsseite" loading="lazy" /><figcaption>WebDAV Sync Einstellungsseite</figcaption></figure>

## Laufzeitdaten

Zeigt das Persistenz-Stammverzeichnis, die Laufzeitnutzung und Integritätsdiagnosen an:

- **Persistenz-Stammverzeichnis**: `<Zotero Data>/zotero-agents/data/`
- **Synthesis Canonical Store**: Lokale SQLite + persistente Pakete
- **Verzeichnisgrößen**: data/, cache/, logs/, tmp/ usw.
- **Diagnose-Panel**: Erkennt Dateisystemprobleme (z.B. nicht bereinigte WAL-Dateien)

Hinweis: Der Synthesis Canonical Store und die Zustandsdatenbanken dienen nur der Diagnose und können hier nicht bereinigt werden.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/preferences_storage-and-persistence.webp" alt="Laufzeitdaten und Persistenzverwaltungsseite" title="Laufzeitdaten und Persistenzverwaltungsseite" loading="lazy" /><figcaption>Laufzeitdaten und Persistenzverwaltungsseite</figcaption></figure>

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
