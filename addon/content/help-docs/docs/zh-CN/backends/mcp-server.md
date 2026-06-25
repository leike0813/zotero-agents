# MCP Server

## Overview

MCP (Model Context Protocol) Server is an embedded protocol service that exposes your Zotero library and Synthesis capabilities as 40+ MCP tools. MCP-compatible clients (Claude Desktop, Cursor, VS Code extensions, etc.) can directly access Zotero data.

MCP Server shares the underlying Host Bridge capability registry but follows the MCP protocol specification (Streamable HTTP transport, JSON-RPC 2.0).

## Configuration

Zotero → Settings → Zotero Agents → Host Bridge → **Enable MCP Server**

A single checkbox toggles the server on/off. Enabled by default.

### Non-configurable Defaults

| Setting | Value | Reason |
|---------|-------|--------|
| Listen address | `127.0.0.1` | Security: loopback only |
| Origin validation | Strict | Only `127.0.0.1`, `localhost`, `[::1]` |
| Request size limit | 1 MB | Memory protection |
| Write protection | Enabled | All write operations require approval |

## Security

- **Bearer Token auth**: shares the same session/master token as Host Bridge
- **Loopback only**: no remote access possible
- **Origin validation**: cross-origin requests rejected (403)
- **1 MB cap**: oversized bodies rejected at 413
- **Single-threaded queue**: 1 running + 8 pending, 45s run timeout, 30s queue timeout
- **Circuit breakers**: 3 failures in 5 minutes → tool paused for 60s

## Connecting MCP Clients

### Endpoint

```
http://127.0.0.1:<port>/mcp
```

Port is auto-assigned (range 26370-26569). Check the Host Bridge endpoint in preferences for the actual port.

### Claude Desktop Configuration Example

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

Get the token from Preferences → Host Bridge → **Copy Master Token**.

### Protocol Details

- Transport: Streamable HTTP (`POST /mcp`)
- Version: `2025-06-18`
- Server identity: `zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405 (only POST accepted)
- Requests without `id` → treated as notifications (no response)
- `id: null` → explicitly invalid

## Tool Inventory

<details>
<summary>All 40+ tools</summary>

### Read Tools

| Tool | Description |
|------|-------------|
| `get_current_view` | Current Zotero view info |
| `get_selected_items` | Currently selected item summaries |
| `search_items` | Search items (limit ≤ 50) |
| `list_library_items` | Paginated item listing |
| `get_item_detail` | Full item metadata |
| `get_item_notes` | List child notes |
| `get_note_detail` | Read note body (chunked, ≤16k chars per chunk) |
| `list_note_payloads` | List workflow payloads in a note |
| `get_note_payload` | Read one payload |
| `get_item_attachments` | List attachment manifests (no file bytes) |
| `prepare_paper_reading_context` | Aggregate metadata, notes, payloads, attachments for one paper |

### Write Tools (require approval)

| Tool | Description |
|------|-------------|
| `preview_mutation` | Preview a write operation without executing |
| `update_item_fields` | Update allowed fields on one item |
| `add_item_tags` | Add tags to one or more items |
| `remove_item_tags` | Remove tags |
| `create_child_note` | Create a child note |
| `update_note` | Update a note body |
| `create_markdown_note` | Create a note with rendered HTML + base64 markdown payload |
| `update_markdown_note` | Update an existing markdown-backed note |
| `ingest_paper` | Ingest a paper by DOI/arXiv/PMID/ISBN (with PDF attachment) |
| `add_items_to_collection` | Add items to a collection |
| `remove_items_from_collection` | Remove items from a collection |

### Diagnostic Tool

| Tool | Description |
|------|-------------|
| `get_mcp_status` | Service diagnostics: queue, circuit breakers, recent requests |

### Synthesis Tools

| Tool | Description |
|------|-------------|
| `topics.list` | List all topics |
| `topics.find_by_paper_ref` | Find topics by paper reference |
| `topics.get_context` | Get full topic context |
| `topics.get_review_input` | Assemble topic review package |
| `schemas.get` | Get schema definitions |
| `concepts.query` | Query the concept knowledge base |
| `citation_graph.query_cluster` | Query citation cluster |
| `citation_graph.get_overview` | Get graph overview |
| `citation_graph.get_slice` | Extract subgraph slice |
| `citation_graph.get_metrics` | Compute graph metrics (pagerank, foundation, frontier) |
| `citation_graph.rank_external_references` | Rank external references |
| `citation_graph.rank_library_papers` | Rank library papers |
| `library_index.get` | Paginated library index |
| `resolvers.resolve` | Resolve reference/topic resolvers |
| `reference_index.get` | Get reference index |
| `paper_artifacts.get_manifest` | Get artifact manifest |
| `paper_artifacts.read` | Read artifact content |
| `paper_artifacts.export_filtered` | Export filtered artifacts |
| `paper_artifacts.resolve_topic_digest` | Resolve topic digest |
| `insights.get_attention_queue` | Get attention queue |

</details>

## Write Protection

Write tools follow the same approval model as Host Bridge:

```
MCP client invokes write tool
  │
  ├── Bearer Token validated
  ├── Tool scope extracted
  ├── Approval check:
  │     ├── Read-only tool → execute immediately
  │     ├── Pre-approved write → execute immediately
  │     └── Approval needed → queue to Zotero UI
  └── Execute / Deny
```

Queue: max 50 pending approvals; >10 denied writes in 5 minutes → circuit breaker (disabled for 30s).

## Next Steps

- [Host Bridge](#doc/backends%2Fhost-bridge) — the underlying transport and CLI tool
- [Preferences](#doc/preferences) — view MCP Server settings
