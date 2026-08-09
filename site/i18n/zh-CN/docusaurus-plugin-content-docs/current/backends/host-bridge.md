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
│     └── Capability Router (60+ capabilities)
│
└── zotero-bridge CLI (companion binary)
      ├── Semantic commands (context, library, mutation, synthesis)
      ├── Config files (bridge-profile.json)
      └── Stdin/pipe mode (for ACP agent integration)
```

Protocol version: `host-bridge.v2`. All endpoints except `GET /bridge/v1/health` require Bearer Token authentication. Capability contracts use `host-bridge.capabilities.v2`.

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

Host Bridge writes, workflow submission, and dangerous capabilities require Zotero UI approval by default:

| Level | Description |
|-------|-------------|
| **Approval required by default** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Auto-approved** | All read-only operations, `diagnostic.get_status`, `mutation.preview` |

**Double-gate auto-approval:**
1. Workflow manifest declares `allowWriteApprovalBypass: true`
2. User explicitly checks auto-approve in the submit dialog

Both must be satisfied for auto-approval to take effect.

The global Host Bridge danger-zone preference can disable these approvals for trusted temporary debugging sessions.

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

<details>
<summary>All 125 canonical commands</summary>

#### surface — Agent Surface
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Server Status & Profile
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Reading the Library
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

#### context — UI Context & Navigation
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Synthesis Layer
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

#### mutation — Write Operations
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

#### workflow — Workflow Management
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

#### run — Runtime Observation
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

#### file — File Transfers
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Dashboard Products
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Persistent Operations
```
zotero-bridge operation get --operation-id <id>
```

</details>

Input accepts: inline JSON, JSON file path, `@file` syntax, `-` (stdin).

For the complete, up-to-date command catalog, run `zotero-bridge surface identity --json` to see the current `commandCatalogChecksum`, then `zotero-bridge surface describe <command...>` for any specific command's contract.

### Output Contract

stdout always emits exactly one JSON object:

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
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
  "protocol": "host-bridge.v2",
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
<summary>All 60+ capabilities</summary>

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
| `library.list_annotations` | List reader annotations |
| `library.export_annotations` | Export reader annotations as markdown or JSON |
| `library.readiness_audit` | Paginated read-only library readiness audit |

### Mutation

| Capability | Description |
|-----------|-------------|
| `mutation.preview` | Preview a write operation (no execute) |
| `mutation.execute` | Execute a write operation (requires approval) |

### Workflow Products

| Capability | Description |
|-----------|-------------|
| `workflow_products.list` | List normal Dashboard Products |
| `workflow_products.get` | Return public metadata for one product |
| `workflow_products.read_asset` | Register one product asset for download |
| `workflow_products.export` | Export one or all product assets |
| `workflow_products.remove` | Remove one product record |

### Synthesis — Topics

| Capability | Description |
|-----------|-------------|
| `topics.list` | List all topics |
| `topics.find_by_paper_ref` | Find topics by paper reference |
| `topics.get_context` | Get topic context |
| `topics.get_report` | Get topic report |
| `topics.get_review_input` | Assemble topic review package |

### Synthesis — Citation Graph

| Capability | Description |
|-----------|-------------|
| `citation_graph.query_cluster` | Query citation cluster |
| `citation_graph.get_overview` | Get graph overview |
| `citation_graph.get_slice` | Extract subgraph slice |
| `citation_graph.get_metrics` | Compute graph metrics |
| `citation_graph.get_layout` | Get persisted layout coordinates |
| `citation_graph.rank_external_references` | Rank external references |
| `citation_graph.rank_library_papers` | Rank library papers |
| `citation_graph.refresh_metrics` | Diagnostic: refresh persisted metrics |
| `citation_graph.update` | Start atomic citation-graph update |

### Synthesis — Concepts, Schemas, Resolvers

| Capability | Description |
|-----------|-------------|
| `concepts.query` | Query concept knowledge base |
| `schemas.get` | Get schema definitions |
| `resolvers.resolve` | Resolve reference/topic resolvers |

### Synthesis — Paper Artifacts

| Capability | Description |
|-----------|-------------|
| `paper_artifacts.get_manifest` | Get artifact manifest |
| `paper_artifacts.read` | Read artifact content |
| `paper_artifacts.export_filtered` | Export filtered artifacts |
| `paper_artifacts.resolve_topic_digest` | Resolve topic digest |

### Synthesis — Indexes & Insights

| Capability | Description |
|-----------|-------------|
| `reference_index.get` | Get reference index |
| `reference_sidecar.refresh` | Start reference sidecar refresh |
| `library_index.get` | Get library index |
| `insights.get_attention_queue` | Get attention queue |
| `synthesis.operation.get` | Read persistent synthesis operation receipt |

### Diagnostic

| Capability | Description |
|-----------|-------------|
| `diagnostic.get_status` | Get service status |

### Debug (debug mode only)

| Capability | Description |
|-----------|-------------|
| `debug.status` | Debug Host Bridge status snapshot |
| `debug.persistence.snapshot` | Runtime persistence snapshot |
| `debug.tasks.snapshot` | Workflow task and ACP run diagnostics |
| `debug.zotero.eval` | Execute approved JavaScript in Zotero context |
| `debug.acpSkillRun.reapplyResult` | Re-run applyResult for an ACP skill run |
| `debug.skillrunner.connections.snapshot` | SkillRunner connection governor diagnostics |
| `debug.synthesis.snapshot` | Synthesis operation and cache snapshot |
| `debug.synthesis.diff` | Compare Zotero payloads vs repository caches |
| `debug.synthesis.cache.list` | List synthesis sidecar cache rows |
| `debug.synthesis.operations.list` | List synthesis operations |
| `debug.synthesis.paper.inspect` | Inspect one paper across caches |
| `debug.synthesis.topic.inspect` | Inspect one topic across artifacts |
| `debug.synthesis.profiler.list` | Synthesis profiler runs |
| `debug.synthesis.cleanInstallReset` | Dangerous: reset synthesis DB state |

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

- [MCP Server](mcp-server) — standardized protocol interface for MCP-compatible clients (Claude Desktop, etc.)
- [Hermes Profiles](hermes-profiles) — ready-to-install profile for managing your Zotero library with AI agents
- [Preferences](../preferences) — view all Host Bridge settings
- [ACP Backend](acp) — learn about ACP Agent configuration
