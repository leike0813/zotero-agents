# Host Bridge

## Übersicht

Host Bridge ist der im Plugin eingebettete HTTP-Server, der externen KI-Tools (Codex, Claude Code, OpenCode usw.) den direkten Zugriff auf Ihre Zotero-Bibliothek ermöglicht. Er ist die Kommunikationsbrücke zwischen ACP-Agenten und Zotero und dient als zugrundeliegender Transport für sowohl das `zotero-bridge`-CLI als auch den MCP-Server.

## Architektur

```
Zotero-Plugin-Prozess
│
├── Host-Bridge-HTTP-Server (Loopback: 127.0.0.1:<port>)
│     ├── Bearer-Token-Authentifizierung (jede Anfrage)
│     ├── Schreibgenehmigungsschranke (pro Vorgang)
│     └── Fähigkeitsrouter (30+ Fähigkeiten)
│
└── zotero-bridge-CLI (Begleit-Binary)
      ├── Semantische Befehle (context, library, mutation, synthesis)
      ├── Konfigurationsdateien (bridge-profile.json)
      └── Stdin/Pipe-Modus (für ACP-Agent-Integration)
```

Protokollversion: `host-bridge.v1`. Alle Endpunkte außer `GET /bridge/v1/health` erfordern Bearer-Token-Authentifizierung.

## Konfiguration

Zotero → Einstellungen → Zotero Agents → Host Bridge

| Einstellung | Typ | Standard | Beschreibung |
|---------|------|---------|-------------|
| **MCP-Server aktivieren** | boolean | `true` | Auch das MCP-Protokoll für Drittanbieter-Agenten aktivieren |
| **Schreibgenehmigung deaktivieren** | boolean | `false` | Gefährlich: Alle Schreibgenehmigungen umgehen. Als rote Gefahrenzone markiert |
| **LAN-Zugriff aktivieren** | boolean | `false` | An `0.0.0.0` für LAN-Zugriff binden (erzwingt festen Port) |
| **Fester Port** | boolean | `false` | Port (Standard 26570) fest anstatt zufälligen Port verwenden |
| **Portnummer** | number | `26570` | Im festen Modus verwendeter Port (1024-65535) |
| **LAN-IP** | string | `""` | Manuelle Überschreibung der beworbenen LAN-IP; leer lassen für automatische Erkennung |
| **Starten / Endpunkt anzeigen** | Schaltfläche | — | Sicherstellen, dass Server läuft, und aktuelle Endpunkt-URL anzeigen |
| **Token rotieren** | Schaltfläche | — | Das Sitzungstoken rotieren |
| **Master-Token erstellen / rotieren** | Schaltfläche | — | Ein persistentes sitzungsübergreifendes Token generieren |
| **Master-Token kopieren** | Schaltfläche | — | Token in die Zwischenablage kopieren |
| **Remote-CLI-Profil kopieren** | Schaltfläche | — | Das vollständige Remote-CLI-Profil-JSON kopieren |
| **CLI installieren** | Schaltfläche | — | Ein-Klick-Installation von `zotero-bridge` in den System-PATH |

## Sicherheitsmodell

### Bearer-Token-Authentifizierung

- Jede Anfrage muss den Header `Authorization: Bearer <token>` enthalten
- **Sitzungstoken**: Wird beim Plugin-Start automatisch generiert (24 Bytes Base64), lebt für die Plugin-Sitzung
- **Master-Token**: Optionales persistentes Token, AES-256-GCM-verschlüsselter Speicher, für sitzungsübergreifenden CLI-Zugriff
- Token werden niemals in Prompts, Logs oder Agent-Ausgaben geschrieben

### Schreibgenehmigung

Schreibvorgänge erfordern eine Genehmigung durch die Zotero-Benutzeroberfläche:

| Ebene | Beschreibung |
|-------|-------------|
| **Genehmigung erforderlich** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Automatisch genehmigt** | Alle schreibgeschützten Vorgänge, `diagnostic.get_status`, `mutation.preview` |

**Doppelschranken-Automatikgenehmigung:**
1. Workflow-Manifest deklariert `allowWriteApprovalBypass: true`
2. Benutzer hat die Automatikgenehmigung im Einreichungsdialog explizit aktiviert

Beide Bedingungen müssen erfüllt sein, damit die Automatikgenehmigung wirksam wird.

### LAN-/Remote-Sicherheit

- LAN-Modus bindet `0.0.0.0` und muss manuell aktiviert werden. **Nur in vertrauenswürdigen Netzwerken verwenden**
- Remote-Zugriff erfordert ein Master-Token (manuell erstellt), wird niemals automatisch verteilt
- LAN-IP-Automatikerkennung verwendet die SkillRunner-Backend-Netzwerkreflexion; kann manuell überschrieben werden

## Das `zotero-bridge`-CLI

`zotero-bridge` ist ein Rust-CLI-Tool für ACP-Agenten und Terminalbenutzer zum Aufruf von Host Bridge.

### Installation

Verwenden Sie die Schaltfläche „CLI installieren" in den Einstellungen. ACP-Läufe verwenden das im Plugin gebündelte Binary (in den Workspace-PATH injiziert).

### Endpunkt-/Token-Auflösungspriorität

| Quelle | Endpunkt | Token |
|--------|----------|-------|
| CLI-Schalter | `--endpoint` | — |
| Umgebung | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Profildatei | Feld `endpoint` | `auth.token` / `auth.tokenEnv` |

### Semantische Befehle

```
zotero-bridge status                           # Gesundheitsprüfung (keine Auth)
zotero-bridge manifest                         # Vollständiges Fähigkeitsmanifest
zotero-bridge call <fähigkeit> [--input]      # Roher Fähigkeitsaufruf
zotero-bridge item search --query <text>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input <JSON>
zotero-bridge workflow run <runId>
zotero-bridge file download <fileId> --output <path>
```

Eingabe akzeptiert: Inline-JSON, JSON-Dateipfad, `@file`-Syntax, `-` (stdin).

### Ausgabevertrag

stdout gibt immer genau ein JSON-Objekt aus:

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
```

Fehler-Exit-Codes:

| Kategorie | Exit-Code |
|----------|----------:|
| usage | 2 |
| config | 3 |
| connection | 4 |
| auth | 5 |
| permission | 6 |
| validation | 7 |
| capability | 8 |
| workflow | 9 |
| download | 10 |
| protocol | 11 |
| internal | 70 |

### Profildateien

Bekannte Profilorte:

| Betriebssystem | Pfad |
|----|------|
| Windows | `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` |
| macOS | `~/Library/Application Support/zotero-agents/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## ACP-Agent-Integration

Wenn ein ACP-Agent einen Skill ausführt, injiziert das Plugin automatisch:

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # CLI-Shim
  profile.json                # Verbindungsprofil (Token über Umgebungsvariable)
  README.md                   # Nutzungshinweise
```

Injizierte Umgebungsvariablen:

- `ZOTERO_BRIDGE_PROFILE` — Pfad zu profile.json
- `ZOTERO_BRIDGE_TOKEN` — Bearer-Token
- `ZOTERO_BRIDGE_SCOPE` — Genehmigungsbereichs-JSON
- `PATH` / `Path` — `.zotero-bridge/bin` wird vorangestellt

## Verfügbare Fähigkeiten

<details>
<summary>Alle 30+ Fähigkeiten</summary>

### Kontext

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `context.get_current_view` | Aktuelle Zotero-Ansichtsinformationen |
| `context.get_selected_items` | Aktuell ausgewählte Elemente |

### Bibliothek

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `library.search_items` | Elemente suchen |
| `library.get_item_detail` | Elementdetails abrufen |
| `library.list_items` | Paginierte Elementauflistung |
| `library.get_item_notes` | Notizen auflisten |
| `library.get_note_detail` | Notizinhalt lesen |
| `library.list_note_payloads` | Notiz-Payloads auflisten |
| `library.get_note_payload` | Bestimmtes Payload abrufen |
| `library.get_item_attachments` | Anhänge auflisten |

### Mutation

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `mutation.preview` | Schreibvorgang vorschauen (nicht ausführen) |
| `mutation.execute` | Schreibvorgang ausführen (erfordert Genehmigung) |

### Synthese

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `topics.list` | Alle Themen auflisten |
| `topics.get_context` | Themenkontext abrufen |
| `topics.get_report` | Themenbericht abrufen |
| `topics.get_review_input` | Themen-Review-Paket zusammenstellen |
| `schemas.get` | Schemadefinitionen abrufen |
| `concepts.query` | Konzept-Wissensbasis abfragen |
| `citation_graph.query_cluster` | Zitationscluster abfragen |
| `citation_graph.get_overview` | Graphübersicht abrufen |
| `citation_graph.get_slice` | Teilgraph-Slice extrahieren |
| `citation_graph.get_metrics` | Graphmetriken berechnen |
| `citation_graph.rank_external_references` | Externe Referenzen rangieren |
| `citation_graph.rank_library_papers` | Bibliotheksarbeiten rangieren |
| `paper_artifacts.get_manifest` | Artefaktmanifest abrufen |
| `paper_artifacts.read` | Artefaktinhalt lesen |
| `paper_artifacts.export_filtered` | Gefilterte Artefakte exportieren |
| `paper_artifacts.resolve_topic_digest` | Themen-Digest auflösen |
| `insights.get_attention_queue` | Aufmerksamkeits-Warteschlange abrufen |
| `resolvers.resolve` | Referenz-/Themen-Resolver auflösen |
| `reference_index.get` | Referenzindex abrufen |
| `library_index.get` | Bibliotheksindex abrufen |

### Diagnose

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `diagnostic.get_status` | Dienststatus abrufen |

</details>

## Schreibgenehmigungsablauf

```
Agent ruft Schreibfähigkeit auf
  │
  ├── 1. Anfrage kommt bei Host Bridge an (mit Bearer-Token)
  ├── 2. Token validiert
  ├── 3. Bereich extrahiert
  ├── 4. Genehmigungsprüfung:
  │     ├── Nur-Lese-Bereich → sofort ausführen
  │     ├── autoApproveWrites = true UND Benutzer hat vorab genehmigt → ausführen
  │     └── Genehmigung erforderlich → in Zotero-Benutzeroberfläche einreihen
  ├── 5. Genehmigungsaufforderung im ACP-Chat / SkillRunner-Panel angezeigt
  │     ├── Benutzer genehmigt → ausführen
  │     └── Benutzer lehnt ab → Fehler zurückgeben
  └── 6. Ergebnis zurückgegeben, Audit-Log geschrieben
```

Bereichsweiterleitung:

| Bereich | Genehmigungs-UI |
|-------|-------------|
| `acp-skill-run` | ACP-Skills-UI |
| `acp-chat` | ACP-Chat-Panel |
| `skillrunner-run` | SkillRunner-Panel |
| Kein Bereich / `global` | Globale Zotero-Genehmigungs-UI |

## LAN-/Remote-Zugriff

1. **LAN-Zugriff aktivieren** in den Einstellungen anhaken
2. Einen Port festlegen oder den aktuellen Port notieren
3. Ein **Master-Token** erstellen / kopieren
4. Auf **Remote-CLI-Profil kopieren** klicken für die vollständige Verbindungskonfiguration
5. Auf dem Remote-Rechner `endpoint` (`http://<LAN_IP>:<port>/bridge/v1`) und Token konfigurieren
6. Testen: `zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**Wichtig:** LAN-Modus umgeht den Loopback-Schutz. Nur in vertrauenswürdigen lokalen Netzwerken verwenden.

## Nächste Schritte

- [MCP-Server](#doc/backends%2Fmcp-server) — Standardisierte Protokollschnittstelle für MCP-kompatible Clients (Claude Desktop usw.)
- [Einstellungen](#doc/preferences) — Alle Host-Bridge-Einstellungen anzeigen
- [ACP-Backend](#doc/backends%2Facp) — ACP-Agent-Konfiguration kennenlernen
