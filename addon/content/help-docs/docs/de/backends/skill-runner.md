# Skill-Runner-Bereitstellung & -Konfiguration

## Was ist Skill-Runner?

Skill-Runner ist ein eigenständiger Agent-Skill-Ausführungsdienst. Zotero Agents kommuniziert über die HTTP-API mit Skill-Runner, um Skill-Anfragen einzureichen und Ergebnisse abzurufen. Er unterstützt mehrere KI-Agent-CLIs als Backend-Engines und kann als unabhängiger Docker-Container oder lokaler Dienst bereitgestellt werden.

> **🏆 Empfehlungspriorität**: Wenn Sie bereits ein ACP-kompatibles Agent-Tool auf Ihrem Rechner haben (Codex, OpenCode, Claude Code usw.), verwenden Sie bitte zuerst das [ACP-Backend](#doc/backends%2Facp), das keine zusätzliche Konfiguration erfordert. Skill-Runner eignet sich für Szenarien, die einen persistenten Hintergrunddienst oder LAN-Freigabe erfordern.

## Bereitstellungsmodi

### Empfohlen: Docker-persistente Bereitstellung

Ein Docker-basierter Skill-Runner läuft als unabhängiger persistenter Dienst, **unbeeinflusst von Start/Stopp von Zotero** — das Schließen von Zotero ermöglicht die Fortsetzung der Aufgaben im Hintergrund, und beim nächsten Start von Zotero können Sie fortsetzen oder direkt abgeschlossene Ergebnisse abrufen.

Geeignet für:
- Langlaufende Aufgaben (Topic-Synthese, Batch-Literaturanalyse usw.)
- Freigabe einer einzelnen Skill-Runner-Instanz über mehrere Geräte in einem LAN
- Benutzer mit Docker-Erfahrung

#### docker compose (empfohlen) {#recommended-docker-persistent-deployment}

```yaml
version: "3"
services:
  skill-runner:
    image: leike0813/skill-runner:latest
    ports:
      - "9813:9813"
      - "17681:17681"
    volumes:
      - ./skills:/app/skills
      - skillrunner_cache:/opt/cache
      - ./data:/app/data
    environment:
      - SKILL_RUNNER_DATA_DIR=/app/data
      - UI_BASIC_AUTH_ENABLED=false

volumes:
  skillrunner_cache:
```

```bash
mkdir -p data skills
docker compose up -d --build
```

Nach dem Start:
- **API-Dienst**: `http://localhost:9813/v1`
- **Verwaltungsoberfläche**: `http://localhost:9813/ui`

#### Docker-Direktstart

```bash
docker run --rm -p 9813:9813 -p 17681:17681 \
  -v "$(pwd)/skills:/app/skills" \
  -v skillrunner_cache:/opt/cache \
  -v "$(pwd)/data:/app/data" \
  leike0813/skill-runner:latest
```

Portbeschreibungen:

| Port | Zweck |
|------|---------|
| `9813` | HTTP-API + Verwaltungsoberfläche |
| `17681` | Inline-Engine-Terminal im Browser (erfordert ttyd) |

#### Produktionskonfiguration

Für öffentliche Bereitstellungen wird empfohlen, UI Basic Auth zu aktivieren:

```bash
docker run --rm -p 9813:9813 \
  -v "$(pwd)/skills:/app/skills" \
  -e UI_BASIC_AUTH_ENABLED=true \
  -e UI_BASIC_AUTH_USERNAME=admin \
  -e UI_BASIC_AUTH_PASSWORD=your-password \
  leike0813/skill-runner:latest
```

Es wird empfohlen, dies mit einem HTTPS-Reverse-Proxy (wie Nginx) zu verwenden.

### Notfall: Ein-Klick-Lokaler Modus

> ⚠️ Dieser Modus ist nur für Benutzer geeignet, die **keine Kenntnisse zur Installation von Agent-Tools haben und Docker nicht verwenden können**. Wenn Sie in der Lage sind, Agent-CLIs zu installieren oder Docker zu verwenden, bevorzugen Sie bitte das [ACP-Backend](#doc/backends%2Facp) oder die oben genannte Docker-Bereitstellung.

Der Ein-Klick-bereitgestellte Skill-Runner startet und stoppt automatisch zusammen mit dem Zotero-Plugin — **das Schließen von Zotero beendet alle gerade laufenden Aufgaben**, und es gibt keine Hintergrundausführung. Unterbrochene Aufgaben müssen erneut eingereicht werden.

**Bereitstellungsschritte:**

1. Öffnen Sie **Zotero → Einstellungen → Zotero Agents**
2. Finden Sie den Abschnitt **SkillRunner Local Backend**
3. Klicken Sie auf **Ein-Klick-Bereitstellung** (falls noch nicht installiert)
   - Das Plugin lädt automatisch die neueste Version von GitHub Releases herunter
   - Installiert im Plugin-Datenverzeichnis
   - Der Status ändert sich nach Abschluss auf „Installiert"
4. Klicken Sie auf **Starten**
   - Standardadresse: `http://127.0.0.1:29813`
   - Wenn der Port belegt ist, werden automatisch die nächsten 10 Ports versucht

**Beschreibungen der Aktionsschaltflächen:**

| Schaltfläche | Funktion |
|--------|----------|
| Bereitstellen | Die Skill-Runner-Laufzeitumgebung herunterladen und installieren |
| Starten | Den lokalen Skill-Runner-Prozess starten |
| Stoppen | Den laufenden Skill-Runner-Prozess stoppen |
| Deinstallieren | Die installierten Laufzeitumgebungsdateien entfernen |
| Verwaltungsoberfläche öffnen | Die integrierte Web-Verwaltungsoberfläche des Skill-Runners in der Seitenleiste öffnen |
| Skills-Ordner öffnen | Das Verzeichnis öffnen, in dem Skill-Dateien gespeichert sind |
| Modell-Cache aktualisieren | Den Backend-Modelllisten-Cache aktualisieren |
| Debug-Konsole öffnen | Die Backend-Logausgabe anzeigen |

### Remote-Modus

Verbindung mit einer Remote- oder Cloud-gehosteten Skill-Runner-Instanz.

> ⚠️ **Sicherheitshinweis**: Die aktuelle Version bietet keinen zusätzlichen Sicherheitsschutz für Remote-Verbindungen (wie TLS, API-Schlüsselüberprüfung usw.), sondern verlässt sich nur auf die Bearer-Token-Authentifizierung. **Remote-Verbindungen werden in Nicht-LAN-Umgebungen nicht empfohlen**. Bei der Bereitstellung innerhalb eines LAN wird empfohlen, eine Firewall zur Einschränkung der Zugriffsquellen zu verwenden.

**Konfigurationsschritte:**

1. Öffnen Sie **Werkzeuge → [Backend-Manager](#doc/backends%2Fbackend-manager)**
2. Wechseln Sie zur Registerkarte **SkillRunner**
3. Klicken Sie auf **SkillRunner hinzufügen**
4. Füllen Sie aus:
   - **Anzeigename**: Ein benutzerfreundlicher Name
   - **Basis-URL**: Remote-Instanzadresse (z. B. `http://192.168.1.100:9813`)
   - **Authentifizierung**: Wählen Sie `bearer` und füllen Sie das **Auth-Token** aus (falls das Backend Authentifizierung erfordert)
   - **Zeitlimit**: Anfragetimeout (optional)
5. Klicken Sie auf **Speichern** in der unteren rechten Ecke

## Lokale Bereitstellung (ohne Docker)

### Schnelles Bereitstellungsskript

```bash
# Linux / macOS
./scripts/deploy_local.sh

# Windows (PowerShell)
.\scripts\deploy_local.ps1
```

Voraussetzungen: `uv`, `Node.js`, `npm`. `ttyd` ist optional.

### Steuerungs-CLI

```bash
# Status prüfen
./scripts/skill-runnerctl status --mode local --json

# Starten
./scripts/skill-runnerctl up --mode local --json

# Stoppen
./scripts/skill-runnerctl down --mode local --json
```

Standardparameter des lokalen Modus:
- **Linux/macOS**: `$HOME/.local/share/skill-runner`
- **Windows**: `%LOCALAPPDATA%\SkillRunner`
- **Port**: `29813` (Ausweichbereich `29813-29823`)
- **Bindung**: Nur `127.0.0.1`

### Release-Installer

```bash
# Linux / macOS
./scripts/skill-runner-install.sh --version v0.4.3

# Windows (PowerShell)
.\scripts\skill-runner-install.ps1 -Version v0.4.3
```

Das Skript lädt automatisch `skill-runner-<version>.tar.gz` + `.sha256` herunter und überprüft die SHA256-Integrität vor der Installation.

## Engine-System

Skill-Runner unterstützt mehrere KI-Agent-CLIs als Ausführungsengines und bietet eine einheitliche Anpassungsschicht.

### Unterstützte Engines

| Engine | Paketname |
|--------|-------------|
| Codex | `@openai/codex` |
| Gemini CLI | `@google/gemini-cli` |
| OpenCode | `opencode-ai` |
| Claude Code | `@anthropic-ai/claude-code` |
| Qwen | `@qwen-code/qwen-cli` |

### Konfigurationspriorität

Die Engine-Konfiguration wird aus vier Schichten zusammengeführt (niedrig → hoch):

1. **Engine-Standardwerte**: Standardkonfiguration, die in den Engine-Adapter eingebaut ist
2. **Empfohlene Werte des Skills**: Empfohlene Konfiguration aus dem Skill-Paket `assets/<engine>_config.*`
3. **Benutzeroptionen**: Parameter aus dem API-Anfragekörper
4. **Erzwungene Konfiguration**: Erzwungene Konfiguration aus dem Engine-Adapter (kann nicht überschrieben werden)

### Engine-Authentifizierung

| Methode | Beschreibung | Empfehlung |
|--------|-------------|----------------|
| **OAuth-Proxy** | OAuth über die Verwaltungsoberfläche abschließen; Anmeldedaten werden automatisch gespeichert | ⭐ Empfohlen |
| **CLI-Delegation** | Den integrierten lokalen Anmeldeablauf der Engine verwenden | Alternative |
| **Inline-TUI** | Engine-Terminal im Browser (erfordert ttyd) | Zur Fehlersuche |
| **Anmeldedatendatei importieren** | Anmeldedatendateien über die Benutzeroberfläche hochladen | Alternative |
| **Container-CLI-Anmeldung** | CLI-Anmeldung direkt über `docker exec` ausführen | Für Container-Umgebungen |

## Verwaltungsoberfläche

Die integrierte Web-Verwaltungsoberfläche bietet vollständige Betriebsmöglichkeiten für Skill-Runner.

Zugriffs-URL: `http://localhost:<port>/ui`

| Funktion | Beschreibung |
|---------|-------------|
| **Skill-Browser** | Installierte Skills anzeigen, Paketstruktur und Dateiinhalte inspizieren |
| **Engine-Verwaltung** | Engine-Status überwachen, Upgrades auslösen, Engine-Logs anzeigen |
| **Modellkatalog** | Engine-Modell-Snapshots durchsuchen und verwalten |
| **Inline-TUI** | Engine-Terminals direkt im Browser starten (erfordert ttyd) |
| **Einstellungen** | Logstufe, Datenaufbewahrungsdauer, maximale Verzeichnisgröße usw. |

## REST-API-Übersicht

### Kernausführungs-Endpunkte

```bash
# Verfügbare Skills auflisten
curl http://localhost:9813/v1/skills

# Einen Job erstellen (einen Skill ausführen)
curl -X POST http://localhost:9813/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "my-skill",
    "engine": "gemini",
    "parameter": { "language": "zh-CN" },
    "model": "gemini-3-pro-preview"
  }'

# Ergebnisse abrufen
curl http://localhost:9813/v1/jobs/<request_id>/result

# Einen Job abbrechen
curl -X POST http://localhost:9813/v1/jobs/<request_id>/cancel
```

### Echtzeitüberwachung (SSE)

Zwei SSE-Kanäle zur Echtzeitbeobachtung des Ausführungsprozesses:

| Kanal | Endpunkt | Zweck |
|---------|----------|---------|
| Chat | `GET /v1/jobs/{id}/chat?cursor=N` | Chat-Bubble-Stream |
| Ereignisse | `GET /v1/jobs/{id}/events?cursor=N` | Vollständiger Protokollereignis-Stream |

Beide Kanäle unterstützen die Cursor-basierte Wiederverbindung nach Trennung.

### Verwaltungs-API

Stabile JSON-Verwaltungsendpunkte, geeignet für Frontend-Integration:

| Endpunkt | Zweck |
|----------|---------|
| `GET /v1/management/skills` | Skill-Zusammenfassung |
| `GET /v1/management/engines` | Engine-Status |
| `GET /v1/management/runs` | Ausführungsverlauf (seitenbasiert) |
| `GET /v1/management/runs/{id}/chat` | Unterhaltungs-SSE-Stream |
| `POST /v1/management/runs/{id}/reply` | Eine Antwort auf einen interaktiven Skill einreichen |
| `POST /v1/management/runs/{id}/cancel` | Einen Lauf abbrechen |

### Lokale Laufzeit-Lease-API

Der lokale Laufzeitmodus verwendet eine Lease-basierte Lebenszyklusverwaltung:

| Endpunkt | Zweck |
|----------|---------|
| `POST /v1/local-runtime/lease/acquire` | Einen Lease erwerben |
| `POST /v1/local-runtime/lease/heartbeat` | Lease erneuern (TTL: 60s) |
| `POST /v1/local-runtime/lease/release` | Den Lease freigeben |

Die lokale Laufzeit wird automatisch beendet, wenn der Lease abläuft.

## Skill-Paketverwaltung

### Persistente Installation

```bash
# Ein Skill-Paket-ZIP hochladen
curl -X POST http://localhost:9813/v1/skill-packages/install \
  -H "Content-Type: multipart/form-data" \
  -F "file=@my-skill.zip"
```

Serverseitige Validierungsregeln:
- Das Paket muss ein Verzeichnis auf oberster Ebene enthalten
- Muss `SKILL.md` + `assets/runner.json` haben
- Muss drei Schemadateien haben (Eingabe / Parameter / Ausgabe)
- Verzeichnisname == `runner.json.id` == `SKILL.md`-Frontmatter-Name (Identitätskonsistenz)
- Updates müssen streng versionssteigernd sein

### Temporärer Lauf (ohne Installation)

```bash
# Einen temporären Lauf erstellen
curl -X POST http://localhost:9813/v1/temp-skill-runs \
  -H "Content-Type: application/json" \
  -d '{ "engine": "gemini", "parameter": {} }'

# Ein Skill-Paket hochladen und starten
curl -X POST http://localhost:9813/v1/temp-skill-runs/<id>/upload \
  -F "skill_package=@my-skill.zip"
```

Temporäre Läufe werden nach Erreichen eines Endzustands automatisch bereinigt.

## Ausführungslebenszyklus

Eine typische Skill-Ausführung umfasst die folgenden Phasen:

```
1. Einrichtung & Upload
   └── Client reicht POST /v1/jobs ein
       └── Optionaler Upload von Eingabedateien

2. Orchestrierung
   └── Skill-Manifest laden
       └── Parameterschema validieren
       └── Engine-Kompatibilität prüfen
       └── Parallelitätsgrenzen anwenden

3. Engine-Anpassung
   └── Umgebung vorbereiten (Skill-Paket kopieren)
       └── Eingabedateien parsen
       └── Prompt über Jinja2-Vorlagen erstellen
       └── Ausführungsverzeichnis-Vertrauen setzen

4. Ausführung
   └── Engine-CLI startet als Unterprozess
       └── Isoliertes Arbeitsverzeichnis
       └── stdout/stderr in Echtzeit gestreamt

5. Abschluss
   └── Ausgabevalidierung (gegen output.schema.json)
       └── Artefaktdateien parsen
       └── Bundle generieren (ZIP + Manifest)
       └── Status auf succeeded / failed / canceled gesetzt
```

Wenn ein Lauf fehlschlägt, enthält das Debug-Bundle vollständige Logs und Diagnose dateien.

## Datenverzeichnisstruktur

```
data/
├── runs/<run_id>/              # Lauf-Arbeitsbereich
│   ├── .state/state.json       # Laufstatus
│   ├── .audit/                 # Audit-Logs
│   ├── result/result.json      # Finale strukturierte Ausgabe
│   ├── artifacts/              # Vom Skill generierte Dateien
│   └── bundle/                 # Paketiere Ergebnisse (ZIP + Manifest)
├── requests/<request_id>/      # Anfragphasendaten
│   ├── uploads/                # Hochgeladene Eingabedateien
│   └── request.json            # Originale Anfrageparameter
├── logs/                       # Anwendungslogs (täglich rotiert)
└── system_settings.json        # Über die Benutzeroberfläche bearbeitbare Systemeinstellungen
```

## Umgebungsvariablenreferenz

| Variable | Beschreibung | Standard |
|----------|-------------|---------|
| `SKILL_RUNNER_DATA_DIR` | Laufdatenverzeichnis | `./data` |
| `SKILL_RUNNER_AGENT_HOME` | Isoliertes Konfigurations-Home-Verzeichnis des Agenten | `auto` |
| `SKILL_RUNNER_RUNTIME_MODE` | Laufzeitmodus: local / container | `auto` |
| `UI_BASIC_AUTH_ENABLED` | UI Basic Auth aktivieren | `false` |
| `UI_BASIC_AUTH_USERNAME` | Basic Auth-Benutzername | — |
| `UI_BASIC_AUTH_PASSWORD` | Basic Auth-Passwort | — |

## Laufstatusbeschreibungen

| Status | Beschreibung |
|--------|-------------|
| unknown | Anfangszustand, noch nicht erkannt |
| starting | Wird gestartet |
| running | Läuft normal |
| stopped | Gestoppt |
| degraded | Läuft abnormal |
| reconciling_after_heartbeat_fail | Heartbeat-Erkennung fehlgeschlagen, Wiederherstellung läuft |

## Portbeschreibungen

- Standardport: `29813` (Plugin-lokaler Bereich)
- API-Port für eigenständige Bereitstellung: `9813`
- Ausweichbereich: 10 aufeinanderfolgende Ports (29813–29822)
- Heartbeat-Intervall: 20 Sekunden
- Auto-Start-Erkennung: Prüft alle 15 Sekunden

## Logs

Logs werden in `data/logs/skill_runner.log` geschrieben (täglich rotiert). Sie können die Logstufe, Aufbewahrungsdauer und maximale Verzeichnisgröße über die Einstellungsseite der Verwaltungsoberfläche konfigurieren.

Beim Container-Start werden auch strukturierte Bootstrap-Diagnoselogs in `${SKILL_RUNNER_DATA_DIR}/logs/bootstrap.log` und `agent_bootstrap_report.json` generiert.

## Nächste Schritte

- [Workflows kennenlernen](#doc/workflows%2Findex) — Skill-Runner ist eines der Haupt-Backends zur Ausführung von Workflows
- [Dashboard-Einführung](#doc/dashboard) — Aufgaben ausführungsstatus überwachen
- [SkillRunner-Registerkarte](#doc/sidebar%2Fskillrunner-tab) — SkillRunner-Läufe in der Seitenleiste anzeigen und mit ihnen interagieren
