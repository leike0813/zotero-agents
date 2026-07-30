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
│     └── Fähigkeitsrouter (60+ Fähigkeiten)
│
└── zotero-bridge-CLI (Begleit-Binary)
      ├── Semantische Befehle (context, library, mutation, synthesis)
      ├── Konfigurationsdateien (bridge-profile.json)
      └── Stdin/Pipe-Modus (für ACP-Agent-Integration)
```

Protokollversion: `host-bridge.v2`. Alle Endpunkte außer `GET /bridge/v1/health` erfordern Bearer-Token-Authentifizierung. Capability-Verträge verwenden `host-bridge.capabilities.v2`.

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

<details>
<summary>Alle 125 kanonischen Befehle</summary>

#### surface — Agent-Oberfläche
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Serverstatus & Profil
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Bibliothek lesen
```
zotero-bridge library items list [--cursor <c>]
zotero-bridge library item search --query <text>
zotero-bridge library item get --key <key>
zotero-bridge library item notes --key <key>
zotero-bridge library item attachments --key <key>
zotero-bridge library note get --key <key>
zotero-bridge library note payloads --key <key>
zotero-bridge library note payload --key <key> --payload-id <id>
zotero-bridge library annotation list --key <key>
zotero-bridge library annotation export --key <key> --format json|markdown
zotero-bridge library snapshot --input <json>
zotero-bridge library readiness audit --input <json>
zotero-bridge library readiness missing-pdf --input <json>
zotero-bridge library readiness missing-markdown --input <json>
zotero-bridge library readiness missing-analysis --input <json>
```

#### context — UI-Kontext & Navigation
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Syntheseschicht
```
zotero-bridge synthesis topic list --input <json>
zotero-bridge synthesis topic find-by-paper-ref --input <json>
zotero-bridge synthesis topic get-context --input <json>
zotero-bridge synthesis topic get-report --input <json>
zotero-bridge synthesis topic get-review-input --input <json>
zotero-bridge synthesis schema get
zotero-bridge synthesis concept query --input <json>
zotero-bridge synthesis graph overview --input <json>
zotero-bridge synthesis graph query-cluster --input <json>
zotero-bridge synthesis graph get-slice --input <json>
zotero-bridge synthesis graph get-layout --input <json>
zotero-bridge synthesis graph get-metrics --input <json>
zotero-bridge synthesis graph rank-external-references --input <json>
zotero-bridge synthesis graph rank-library-papers --input <json>
zotero-bridge synthesis graph refresh-metrics --input <json>
zotero-bridge synthesis graph update --input <json>
zotero-bridge synthesis index status
zotero-bridge synthesis index library get --input <json>
zotero-bridge synthesis index reference get --input <json>
zotero-bridge synthesis cache status
zotero-bridge synthesis cache refresh-reference-sidecar --input <json>
zotero-bridge synthesis cache invalidate --input <json>
zotero-bridge synthesis resolver resolve --input <json>
zotero-bridge synthesis artifact manifest --input <json>
zotero-bridge synthesis artifact read --input <json>
zotero-bridge synthesis artifact export-filtered --input <json>
zotero-bridge synthesis artifact resolve-topic-digest --input <json>
zotero-bridge synthesis insight attention-queue
```

#### mutation — Schreibvorgänge
```
zotero-bridge mutation preview --input <json>
zotero-bridge mutation apply --input <json>
zotero-bridge mutation literature-ingest --input <json>
zotero-bridge mutation tag add --input <json>
zotero-bridge mutation tag remove --input <json>
zotero-bridge mutation collection create --input <json>
zotero-bridge mutation collection add-items --input <json>
zotero-bridge mutation collection remove-items --input <json>
zotero-bridge mutation item update --input <json>
zotero-bridge mutation item attach-file --input <json>
zotero-bridge mutation note create --input <json>
zotero-bridge mutation note update --input <json>
zotero-bridge mutation note upsert-payload --input <json>
```

#### workflow — Workflow-Verwaltung
```
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> (--input <json> | --none)
zotero-bridge workflow queue list [--workflow <id>]
zotero-bridge workflow queue cancel --submission-id <id>
zotero-bridge workflow submission get --submission-id <id>
zotero-bridge workflow describe --workflow <id> [--json]
zotero-bridge workflow validate --input <json>
zotero-bridge workflow requirements --workflow <id> --input <json>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --profile <id>
zotero-bridge workflow profile validate --profile <id>
zotero-bridge workflow agent-run --workflow <id> (--input <json> | --none) --output-dir <dir>
zotero-bridge workflow agent-bundle inspect --path <path>
zotero-bridge workflow agent-result validate --input <json>
zotero-bridge workflow agent-apply --run-id <id> --input <json>
zotero-bridge workflow agent-apply-status --run-id <id>
zotero-bridge workflow agent-renew --run-id <id>
zotero-bridge workflow agent-abandon --run-id <id>
```

#### run — Laufzeitbeobachtung
```
zotero-bridge run get --run-id <id>
zotero-bridge run cancel --run-id <id>
zotero-bridge run list [--workflow <id>]
zotero-bridge run active
zotero-bridge run recent
zotero-bridge run workflow recent
zotero-bridge run skill get --run-id <id>
zotero-bridge run skill reply --run-id <id> --input <json>
zotero-bridge run skill connect --run-id <id>
zotero-bridge run skill recent
zotero-bridge run skill events --run-id <id>
zotero-bridge run notification list [--limit <n>]
zotero-bridge run notification wait [--timeout-ms <ms>]
zotero-bridge run notification ack --notification-id <id>
zotero-bridge run permission pending
zotero-bridge run permission get --request-id <id>
```

#### file — Dateitransfers
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Dashboard-Produkte
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Persistente Vorgänge
```
zotero-bridge operation get --operation-id <id>
```

</details>

Eingabe akzeptiert: Inline-JSON, JSON-Dateipfad, `@file`-Syntax, `-` (stdin).

Für den vollständigen, aktuellen Befehlskatalog führe `zotero-bridge surface identity --json` aus, um die aktuelle `commandCatalogChecksum` zu sehen, dann `zotero-bridge surface describe <command...>` für den Vertrag eines bestimmten Befehls.

### Ausgabevertrag

stdout gibt immer genau ein JSON-Objekt aus:

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
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
  "protocol": "host-bridge.v2",
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
<summary>Alle 60+ Fähigkeiten</summary>

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
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | Notizen auflisten |
| `library.get_note_detail` | Notizinhalt lesen |
| `library.list_note_payloads` | Notiz-Payloads auflisten |
| `library.get_note_payload` | Bestimmtes Payload abrufen |
| `library.get_item_attachments` | Anhänge auflisten |
| `library.list_annotations` | Reader-Annotationen auflisten |
| `library.export_annotations` | Reader-Annotationen als Markdown oder JSON exportieren |
| `library.readiness_audit` | Paginierte schreibgeschützte Bibliotheks-Reifegradprüfung |

### Mutation

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `mutation.preview` | Schreibvorgang vorschauen (nicht ausführen) |
| `mutation.execute` | Schreibvorgang ausführen (erfordert Genehmigung) |

### Workflow-Produkte

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `workflow_products.list` | Normale Dashboard-Produkte auflisten |
| `workflow_products.get` | Öffentliche Metadaten für ein Produkt zurückgeben |
| `workflow_products.read_asset` | Ein Produkt-Asset zum Download registrieren |
| `workflow_products.export` | Ein oder alle Produkt-Assets exportieren |
| `workflow_products.remove` | Einen Produktdatensatz entfernen |

### Synthese — Themen

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `topics.list` | Alle Themen auflisten |
| `topics.find_by_paper_ref` | Themen nach Papierreferenz finden |
| `topics.get_context` | Themenkontext abrufen |
| `topics.get_report` | Themenbericht abrufen |
| `topics.get_review_input` | Themen-Review-Paket zusammenstellen |

### Synthese — Zitationsgraph

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `citation_graph.query_cluster` | Zitationscluster abfragen |
| `citation_graph.get_overview` | Graphübersicht abrufen |
| `citation_graph.get_slice` | Teilgraph-Slice extrahieren |
| `citation_graph.get_metrics` | Graphmetriken berechnen |
| `citation_graph.get_layout` | Persistierte Layout-Koordinaten abrufen |
| `citation_graph.rank_external_references` | Externe Referenzen rangieren |
| `citation_graph.rank_library_papers` | Bibliotheksarbeiten rangieren |
| `citation_graph.refresh_metrics` | Diagnose: Persistierte Metriken aktualisieren |
| `citation_graph.update` | Atomare Zitationsgraph-Aktualisierung starten |

### Synthese — Konzepte, Schemata, Resolver

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `concepts.query` | Konzept-Wissensbasis abfragen |
| `schemas.get` | Schemadefinitionen abrufen |
| `resolvers.resolve` | Referenz-/Themen-Resolver auflösen |

### Synthese — Papier-Artefakte

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `paper_artifacts.get_manifest` | Artefaktmanifest abrufen |
| `paper_artifacts.read` | Artefaktinhalt lesen |
| `paper_artifacts.export_filtered` | Gefilterte Artefakte exportieren |
| `paper_artifacts.resolve_topic_digest` | Themen-Digest auflösen |

### Synthese — Indizes & Erkenntnisse

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `reference_index.get` | Referenzindex abrufen |
| `reference_sidecar.refresh` | Reference-Sidecar-Aktualisierung starten |
| `library_index.get` | Bibliotheksindex abrufen |
| `insights.get_attention_queue` | Aufmerksamkeits-Warteschlange abrufen |
| `synthesis.operation.get` | Persistiertes Synthese-Vorgangs-Quittung lesen |

### Diagnose

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `diagnostic.get_status` | Dienststatus abrufen |

### Debug (nur Debug-Modus)

| Fähigkeit | Beschreibung |
|-----------|-------------|
| `debug.status` | Debug-Host-Bridge-Status-Snapshot |
| `debug.persistence.snapshot` | Laufzeit-Persistenz-Snapshot |
| `debug.tasks.snapshot` | Workflow-Aufgaben- und ACP-Lauf-Diagnose |
| `debug.zotero.eval` | Genehmigtes JavaScript im Zotero-Kontext ausführen |
| `debug.acpSkillRun.reapplyResult` | applyResult für einen ACP-Skill-Lauf erneut ausführen |
| `debug.skillrunner.connections.snapshot` | SkillRunner-Connection-Governor-Diagnose |
| `debug.synthesis.snapshot` | Synthese-Vorgangs- und Cache-Snapshot |
| `debug.synthesis.diff` | Zotero-Payloads mit Repository-Caches vergleichen |
| `debug.synthesis.cache.list` | Synthese-Sidecar-Cache-Zeilen auflisten |
| `debug.synthesis.operations.list` | Synthese-Vorgänge auflisten |
| `debug.synthesis.paper.inspect` | Ein Papier über Caches hinweg inspizieren |
| `debug.synthesis.topic.inspect` | Ein Thema über Artefakte hinweg inspizieren |
| `debug.synthesis.profiler.list` | Synthese-Profiler-Läufe |
| `debug.synthesis.cleanInstallReset` | Gefährlich: Synthese-Datenbankzustand zurücksetzen |

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

- [MCP-Server](mcp-server) — Standardisierte Protokollschnittstelle für MCP-kompatible Clients (Claude Desktop usw.)
- [Hermes Profiles](hermes-profiles) — Installierbares Profil zur Verwaltung Ihrer Zotero-Bibliothek mit KI-Agenten
- [Einstellungen](../preferences) — Alle Host-Bridge-Einstellungen anzeigen
- [ACP-Backend](acp) — ACP-Agent-Konfiguration kennenlernen
