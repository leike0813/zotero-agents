# MCP-Server

## Übersicht

Der MCP-Server (Model Context Protocol) ist ein eingebetteter Protokolldienst, der Ihre Zotero-Bibliothek und Synthesefunktionen als 40+ MCP-Tools verfügbar macht. MCP-kompatible Clients (Claude Desktop, Cursor, VS Code-Erweiterungen usw.) können direkt auf Zotero-Daten zugreifen.

Der MCP-Server teilt sich die zugrundeliegende Host-Bridge-Fähigkeitsregistrierung, folgt jedoch der MCP-Protokollspezifikation (Streamable-HTTP-Transport, JSON-RPC 2.0).

## Konfiguration

Zotero → Einstellungen → Zotero Agents → Host Bridge → **MCP-Server aktivieren**

Ein einzelnes Kontrollkästchen schaltet den Server ein/aus. Standardmäßig aktiviert.

### Nicht konfigurierbare Standardwerte

| Einstellung | Wert | Grund |
|---------|-------|--------|
| Abhöradresse | `127.0.0.1` | Sicherheit: Nur Loopback |
| Origin-Validierung | Streng | Nur `127.0.0.1`, `localhost`, `[::1]` |
| Anfragengrößenlimit | 1 MB | Speicherschutz |
| Schreibschutz | Aktiviert | Alle Schreibvorgänge erfordern Genehmigung |

## Sicherheit

- **Bearer-Token-Auth**: Teilt sich dasselbe Sitzungs-/Master-Token wie Host Bridge
- **Nur Loopback**: Kein Remote-Zugriff möglich
- **Origin-Validierung**: Cross-Origin-Anfragen werden abgelehnt (403)
- **1-MB-Obergrenze**: Übergroße Bodies werden mit 413 abgelehnt
- **Single-Threaded-Warteschlange**: 1 laufend + 8 ausstehend, 45s Laufzeitlimit, 30s Warteschlangentimeout
- **Schutzschalter**: 3 Fehler in 5 Minuten → Tool für 60s pausiert

## MCP-Clients verbinden

### Endpunkt

```
http://127.0.0.1:<port>/mcp
```

Port wird automatisch zugewiesen (Bereich 26370-26569). Prüfen Sie den Host-Bridge-Endpunkt in den Einstellungen für den tatsächlichen Port.

### Claude-Desktop-Konfigurationsbeispiel

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <ihr-token>"
      }
    }
  }
}
```

Rufen Sie das Token unter Einstellungen → Host Bridge → **Master-Token kopieren** ab.

### Protokolldetails

- Transport: Streamable HTTP (`POST /mcp`)
- Version: `2025-06-18`
- Serveridentität: `zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405 (nur POST akzeptiert)
- Anfragen ohne `id` → werden als Benachrichtigungen behandelt (keine Antwort)
- `id: null` → explizit ungültig

## Tool-Inventar

<details>
<summary>Alle 40+ Tools</summary>

### Lese-Tools

| Tool | Beschreibung |
|------|-------------|
| `get_current_view` | Aktuelle Zotero-Ansichtsinformationen |
| `get_selected_items` | Aktuell ausgewählte Elementzusammenfassungen |
| `search_items` | Elemente suchen (Limit ≤ 50) |
| `list_library_items` | Paginierte Elementauflistung |
| `get_item_detail` | Vollständige Elementmetadaten |
| `get_item_notes` | Kindnotizen auflisten |
| `get_note_detail` | Notiztext lesen (chunkweise, ≤16k Zeichen pro Chunk) |
| `list_note_payloads` | Workflow-Payloads in einer Notiz auflisten |
| `get_note_payload` | Ein Payload lesen |
| `get_item_attachments` | Anhangmanifeste auflisten (keine Datei-Bytes) |
| `prepare_paper_reading_context` | Metadaten, Notizen, Payloads und Anhänge für eine Arbeit aggregieren |

### Schreib-Tools (erfordern Genehmigung)

| Tool | Beschreibung |
|------|-------------|
| `preview_mutation` | Schreibvorgang vorschauen ohne Ausführung |
| `update_item_fields` | Erlaubte Felder eines Elements aktualisieren |
| `add_item_tags` | Tags zu einem oder mehreren Elementen hinzufügen |
| `remove_item_tags` | Tags entfernen |
| `create_child_note` | Eine Kindnotiz erstellen |
| `update_note` | Einen Notiztext aktualisieren |
| `create_markdown_note` | Eine Notiz mit gerendertem HTML + Base64-Markdown-Payload erstellen |
| `update_markdown_note` | Eine bestehende Markdown-gestützte Notiz aktualisieren |
| `ingest_paper` | Eine Arbeit per DOI/arXiv/PMID/ISBN aufnehmen (mit PDF-Anhang) |
| `add_items_to_collection` | Elemente zu einer Sammlung hinzufügen |
| `remove_items_from_collection` | Elemente aus einer Sammlung entfernen |

### Diagnose-Tool

| Tool | Beschreibung |
|------|-------------|
| `get_mcp_status` | Dienst diagnostik: Warteschlange, Schutzschalter, letzte Anfragen |

### Synthese-Tools

| Tool | Beschreibung |
|------|-------------|
| `topics.list` | Alle Themen auflisten |
| `topics.find_by_paper_ref` | Themen nach Arbeitsreferenz finden |
| `topics.get_context` | Vollständigen Themenkontext abrufen |
| `topics.get_review_input` | Themen-Review-Paket zusammenstellen |
| `schemas.get` | Schemadefinitionen abrufen |
| `concepts.query` | Konzept-Wissensbasis abfragen |
| `citation_graph.query_cluster` | Zitationscluster abfragen |
| `citation_graph.get_overview` | Graphübersicht abrufen |
| `citation_graph.get_slice` | Teilgraph-Slice extrahieren |
| `citation_graph.get_metrics` | Graphmetriken berechnen (Pagerank, Foundation, Frontier) |
| `citation_graph.rank_external_references` | Externe Referenzen rangieren |
| `citation_graph.rank_library_papers` | Bibliotheksarbeiten rangieren |
| `library_index.get` | Paginierter Bibliotheksindex |
| `resolvers.resolve` | Referenz-/Themen-Resolver auflösen |
| `reference_index.get` | Referenzindex abrufen |
| `paper_artifacts.get_manifest` | Artefaktmanifest abrufen |
| `paper_artifacts.read` | Artefaktinhalt lesen |
| `paper_artifacts.export_filtered` | Gefilterte Artefakte exportieren |
| `paper_artifacts.resolve_topic_digest` | Themen-Digest auflösen |
| `insights.get_attention_queue` | Aufmerksamkeits-Warteschlange abrufen |

</details>

## Schreibschutz

Schreib-Tools folgen demselben Genehmigungsmodell wie Host Bridge:

```
MCP-Client ruft Schreib-Tool auf
  │
  ├── Bearer-Token validiert
  ├── Tool-Bereich extrahiert
  ├── Genehmigungsprüfung:
  │     ├── Nur-Lese-Tool → sofort ausführen
  │     ├── Vorab-genehmigter Schreibvorgang → sofort ausführen
  │     └── Genehmigung erforderlich → in Zotero-Benutzeroberfläche einreihen
  └── Ausführen / Ablehnen
```

Warteschlange: Max. 50 ausstehende Genehmigungen; >10 abgelehnte Schreibvorgänge in 5 Minuten → Schutzschalter (30s deaktiviert).

## Nächste Schritte

- [Host Bridge](host-bridge) — Der zugrundeliegende Transport und das CLI-Tool
- [Einstellungen](../preferences) — MCP-Server-Einstellungen anzeigen
