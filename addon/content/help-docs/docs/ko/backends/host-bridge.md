# Host Bridge

## Overview

Host Bridge is the plugin's embedded HTTP server that enables external AI tools (Codex, Claude Code, OpenCode, etc.) to access your Zotero library directly. It is the communication bridge between ACP Agents and Zotero, and serves as the underlying transport for both the `zotero-bridge` CLI and the MCP Server.

## Architecture

```
Zotero Plugin Process
│
├── Host Bridge HTTP Server (loopback: 127.0.0.1:<port>)
│     ├── Bearer Token auth (every request)
│     ├── Write Approval Gate (per-operation)
│     └── Capability Router (30+ capabilities)
│
└── zotero-bridge CLI (companion binary)
      ├── Semantic commands (context, library, mutation, synthesis)
      ├── Config files (bridge-profile.json)
      └── Stdin/pipe mode (for ACP agent integration)
```

Protocol version: `host-bridge.v1`. All endpoints except `GET /bridge/v1/health` require Bearer Token authentication.

## Configuration

Zotero → Settings → Zotero Agents → Host Bridge

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Enable MCP Server** | boolean | `true` | Also enable the MCP protocol for third-party agents |
| **Disable Write Approval** | boolean | `false` | Dangerous: bypass all write approval. Marked as a red danger zone |
| **Enable LAN Access** | boolean | `false` | Bind to `0.0.0.0` for LAN access (forces fixed port) |
| **Fixed Port** | boolean | `false` | Pin port (default 26570) instead of using a random port |
| **Port Number** | number | `26570` | Port used in fixed mode (1024-65535) |
| **LAN IP** | string | `""` | Manual override for advertised LAN IP; leave empty for auto-detect |
| **Start / Show Endpoint** | button | — | Ensure server is running and display current endpoint URL |
| **Rotate Token** | button | — | Rotate the session token |
| **Create / Rotate Master Token** | button | — | Generate a persistent cross-session token |
| **Copy Master Token** | button | — | Copy token to clipboard |
| **Copy Remote CLI Profile** | button | — | Copy the full remote CLI profile JSON |
| **Install CLI** | button | — | One-click install of `zotero-bridge` to system PATH |

## Security Model

### Bearer Token Authentication

- Every request must include `Authorization: Bearer <token>` header
- **Session Token**: auto-generated at plugin startup (24 bytes base64), lives for the plugin session
- **Master Token**: optional persistent token, AES-256-GCM encrypted storage, for cross-session CLI access
- Tokens are never written to prompts, logs, or agent output

### Write Approval

Write operations require Zotero UI approval:

| Level | Description |
|-------|-------------|
| **Approval required** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Auto-approved** | All read-only operations, `diagnostic.get_status`, `mutation.preview` |

**Double-gate auto-approval:**
1. Workflow manifest declares `allowWriteApprovalBypass: true`
2. User explicitly checks auto-approve in the submit dialog

Both must be satisfied for auto-approval to take effect.

### LAN / Remote Security

- LAN mode binds `0.0.0.0` and must be manually enabled. **Use only on trusted networks**
- Remote access requires a Master Token (manually created), never auto-distributed
- LAN IP auto-detection uses SkillRunner backend network reflection; can be manually overridden

## The `zotero-bridge` CLI

`zotero-bridge` is a Rust CLI tool for ACP agents and terminal users to call Host Bridge.

### Installation

Use the "Install CLI" button in preferences. ACP runs use the plugin-bundled binary (injected into the workspace PATH).

### Endpoint / Token Resolution Priority

| Source | Endpoint | Token |
|--------|----------|-------|
| CLI flag | `--endpoint` | — |
| Environment | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Profile file | `endpoint` field | `auth.token` / `auth.tokenEnv` |

### Semantic Commands

```
zotero-bridge status                           # Health check (no auth)
zotero-bridge manifest                         # Full capability manifest
zotero-bridge call <capability> [--input]      # Raw capability call
zotero-bridge item search --query <text>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge library list --input '{"limit":50}'
zotero-bridge library snapshot --input '{"limit":200,"cursor":"0"}'
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
zotero-bridge workflow describe --workflow <id>
zotero-bridge workflow submit --workflow <id> (--input <JSON> | --none)
zotero-bridge workflow agent-run --workflow <id> (--input <JSON> | --none) --output-dir <DIR>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--active-only]
zotero-bridge file download <fileId> --output <path>
```

Input accepts: inline JSON, JSON file path, `@file` syntax, `-` (stdin).

### Output Contract

stdout always emits exactly one JSON object:

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
```

Error exit codes:

| Category | Exit Code |
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

### Profile Files

Well-known profile locations:

| OS | Path |
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

## ACP Agent Integration

When an ACP agent runs a skill, the plugin automatically injects:

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # CLI shim
  profile.json                # Connection profile (token via env var)
  README.md                   # Usage hints
```

Injected environment variables:

- `ZOTERO_BRIDGE_PROFILE` — path to profile.json
- `ZOTERO_BRIDGE_TOKEN` — bearer token
- `ZOTERO_BRIDGE_SCOPE` — approval scope JSON
- `PATH` / `Path` — prepended with `.zotero-bridge/bin`

## Available Capabilities

<details>
<summary>All 30+ capabilities</summary>

### Context

| Capability | Description |
|-----------|-------------|
| `context.get_current_view` | Current Zotero view info |
| `context.get_selected_items` | Currently selected items |

### Library

| Capability | Description |
|-----------|-------------|
| `library.search_items` | Search items |
| `library.get_item_detail` | Get item details |
| `library.list_items` | Paginated item listing |
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | List notes |
| `library.get_note_detail` | Read note content |
| `library.list_note_payloads` | List note payloads |
| `library.get_note_payload` | Get a specific payload |
| `library.get_item_attachments` | List attachments |

### Mutation

| Capability | Description |
|-----------|-------------|
| `mutation.preview` | Preview a write operation (no execute) |
| `mutation.execute` | Execute a write operation (requires approval) |

### Synthesis

| Capability | Description |
|-----------|-------------|
| `topics.list` | List all topics |
| `topics.get_context` | Get topic context |
| `topics.get_report` | Get topic report |
| `topics.get_review_input` | Assemble topic review package |
| `schemas.get` | Get schema definitions |
| `concepts.query` | Query concept knowledge base |
| `citation_graph.query_cluster` | Query citation cluster |
| `citation_graph.get_overview` | Get graph overview |
| `citation_graph.get_slice` | Extract subgraph slice |
| `citation_graph.get_metrics` | Compute graph metrics |
| `citation_graph.rank_external_references` | Rank external references |
| `citation_graph.rank_library_papers` | Rank library papers |
| `paper_artifacts.get_manifest` | Get artifact manifest |
| `paper_artifacts.read` | Read artifact content |
| `paper_artifacts.export_filtered` | Export filtered artifacts |
| `paper_artifacts.resolve_topic_digest` | Resolve topic digest |
| `insights.get_attention_queue` | Get attention queue |
| `resolvers.resolve` | Resolve reference/topic resolvers |
| `reference_index.get` | Get reference index |
| `library_index.get` | Get library index |

### Diagnostic

| Capability | Description |
|-----------|-------------|
| `diagnostic.get_status` | Get service status |

</details>

## Write Approval Flow

```
Agent calls write capability
  │
  ├── 1. Request arrives at Host Bridge (with Bearer Token)
  ├── 2. Token validated
  ├── 3. Scope extracted
  ├── 4. Approval check:
  │     ├── Read-only scope → execute immediately
  │     ├── autoApproveWrites = true AND user pre-approved → execute
  │     └── Approval needed → queue to Zotero UI
  ├── 5. Approval prompt shown in ACP Chat / SkillRunner panel
  │     ├── User approves → execute
  │     └── User denies → return error
  └── 6. Result returned, audit log written
```

Scope routing:

| Scope | Approval UI |
|-------|-------------|
| `acp-skill-run` | ACP Skills UI |
| `acp-chat` | ACP Chat panel |
| `skillrunner-run` | SkillRunner panel |
| No scope / `global` | Global Zotero approval UI |

## LAN / Remote Access

1. Check **Enable LAN Access** in preferences
2. Pin a port or note the current port
3. Create / copy a **Master Token**
4. Click **Copy Remote CLI Profile** for the full connection config
5. On the remote machine, configure `endpoint` (`http://<LAN_IP>:<port>/bridge/v1`) and token
6. Test: `zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**Important:** LAN mode bypasses loopback protection. Use only on trusted local networks.

## Next Steps

- [MCP Server](#doc/backends%2Fmcp-server) — standardized protocol interface for MCP-compatible clients (Claude Desktop, etc.)
- [Hermes Profiles](#doc/backends%2Fhermes-profiles) — ready-to-install profile for managing your Zotero library with AI agents
- [Preferences](#doc/preferences) — view all Host Bridge settings
- [ACP Backend](#doc/backends%2Facp) — learn about ACP Agent configuration
