# Zotero Librarian Hermes Profile

## Overview

**zotero-librarian** is a ready-to-install [Hermes](https://github.com/anomalyco/hermes) profile that enables AI agents to manage your Zotero library through the [Host Bridge](host-bridge). It bundles everything an agent needs: the `zotero-bridge` CLI, a Host Bridge connection profile template, a local SQLite metadata index, a workflow catalog cache, run monitoring scripts, and scheduled maintenance cron jobs.

The profile is distributed from the standalone [leike0813/zotero-librarian-profile](https://github.com/leike0813/zotero-librarian-profile) repository. Source development lives in [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents).

## What It Can Do

| Feature | Description |
|---------|-------------|
| **Local Metadata Index** | Maintains a searchable SQLite snapshot of your Zotero library — titles, creators, tags, collections, DOIs, note/attachment counts — for fast, offline-able queries |
| **Workflow Catalog Cache** | Caches all built-in workflow payload contracts locally so agents can submit known workflows without re-querying schemas on every run |
| **Scheduled Maintenance** | Six built-in cron templates: index refresh, workflow catalog refresh, run monitoring, inbox triage, library hygiene, and attention queue summaries |
| **Run Monitoring** | Tracks submitted workflow runs and reports state changes, terminal states, or attention-required items |
| **Attention Queue** | Combines Host Bridge `insights.get_attention_queue` with local index metadata to surface high-priority reading and analysis tasks |

## Installation

### Prerequisites

- [Zotero](https://www.zotero.org/) 7+ with the **Zotero Agents** plugin installed
- Host Bridge running (check: Zotero → Settings → Zotero Agents → Host Bridge → **Start / Show Endpoint**)
- [Hermes](https://github.com/anomalyco/hermes) installed on your system
- `zotero-bridge` CLI available (install via the **Install CLI** button in the Host Bridge preferences panel)

### Install the Profile

```bash
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

This downloads the profile package and extracts it into your Hermes profiles directory.

### Configure Hermes

Edit the profile's `config.yaml` to set up your preferred model provider:

```yaml
# Inside the installed profile directory
provider:
  type: anthropic    # or openai, local, etc.
  model: claude-sonnet-4-20250514
  # ... API key and other provider settings
```

Refer to the [Hermes documentation](https://github.com/anomalyco/hermes) for full provider configuration options.

### Configure Zotero Bridge Connection

The profile ships with a Host Bridge connection template at `assets/host-bridge/profile.example.json`. You need to provide the actual endpoint and token:

1. Open Zotero → Settings → Zotero Agents → Host Bridge
2. Click **Start / Show Endpoint** to ensure the bridge is running and note the endpoint URL (e.g., `http://127.0.0.1:26570/bridge/v1`)
3. Click **Copy Master Token** (or use the session token shown in the panel)
4. Set the token as an environment variable:

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<your-token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<your-token>"
```

5. For remote/LAN access, include the endpoint directly:

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

The profile template uses `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`, so the CLI picks up the token from the environment automatically. See [Host Bridge Configuration](host-bridge) for detailed endpoint, token, and profile file documentation.

### Verify the Setup

```bash
# Check Host Bridge connectivity
zotero-bridge status

# Install CLI binaries into the profile (first time only)
python scripts/install_zotero_bridge_cli.py

# Initial index refresh (pulls all library metadata into local SQLite)
python scripts/zotero_librarian_index_service.py refresh

# Test a search against the local index
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## Index Service Commands

The profile's core utility is `zotero_librarian_index_service.py`. It maintains a local SQLite database for fast, repeated library queries without calling Zotero on every request.

| Command | Description |
|---------|-------------|
| `refresh` | Pages through `zotero-bridge library snapshot` and atomically updates the SQLite index. Items missing from the latest refresh are marked as deleted. |
| `search "<query>"` | Full-text search across titles, creators, identifiers, tags, collections, and publication fields |
| `item <key-or-id>` | Return a single indexed record by Zotero item key or numeric ID |
| `stats` | Report live/deleted item counts, tag counts, collection counts, and workflow catalog status |
| `workflow-refresh` | Call `workflow list` and `workflow describe` to update the local workflow catalog cache |
| `workflow-show <id>` | Display the cached payload contract for a known workflow |
| `run-register --run-id <id> --workflow-id <id>` | Register a submitted workflow run for monitoring |
| `run-watch` | Check all active registered runs and report state changes or terminal states |

## Use Cases

### Library Management

**Daily Inbox Triage** (`cron/inbox-triage.yaml`)

The profile's inbox triage cron runs daily and checks new items in your library for completeness:

- Items with status `0-inbox` (unprocessed)
- Missing tags or collection assignments
- Missing DOI, URL, or attachment files
- Missing summary or digest artifacts

It produces a report of suggested actions but does not make any Zotero mutations without your approval.

**Weekly Library Hygiene** (`cron/library-hygiene.yaml`)

Runs weekly on Monday and scans the library for data quality issues:

- Duplicate entries (by DOI, title, or ISBN)
- Suspicious mojibake (garbled) titles
- Orphaned items (no parent collection)
- Empty collections
- Excessive tag counts on single items
- Items with unusual Zotero item types

All suggestions are read-only until you explicitly approve corrective actions.

**Attention Queue** (`cron/attention-queue.yaml`)

Combines Host Bridge `insights.get_attention_queue` with local index metadata to surface a ranked list of high-priority tasks — papers to read, metadata gaps to fill, workflows to run.

### Literature Search and Import

1. Search your local index first to avoid re-adding papers you already own:
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. If a paper is not found, use the `literature-search-ingest` workflow to search external sources and add it to Zotero:
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. After importing, run the tag-bootstrapper or tag-regulator workflows to normalize tags on the new items.

### Automated Literature Analysis Workflows

The profile catalogs all built-in workflows from the Zotero Agents plugin. Once the catalog is refreshed, you can submit any workflow directly without re-querying its schema.

**Batch Literature Analysis**

Submit the `literature-analysis` workflow on a collection of papers to generate structured digests:

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"zh-CN"}'
```

Register and monitor the run:

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**Deep Reading a Single Paper**

For in-depth analysis of a specific paper:

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"en","mode":"comprehensive"}'
```

**Cross-Paper Topic Synthesis**

Synthesize themes across a collection of papers:

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"en"}'
```

**Translation Assistance**

Translate paper metadata or abstracts:

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"zh-CN","mode":"metadata"}'
```

**Q&A on Papers**

Ask questions about a paper's content:

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"zh-CN"}'
```

## Scheduled Maintenance Jobs

The profile includes six pre-configured cron templates in the `cron/` directory:

| Cron Job | Schedule | Behavior |
|----------|----------|----------|
| `index-refresh` | Every 6 hours | Pages through `library snapshot` to keep the local SQLite index current. Reports `[SILENT]` when no changes are detected. |
| `workflow-catalog-refresh` | Daily at 03:00 | Calls `workflow list` + `workflow describe` to update the workflow catalog cache. Reports `[SILENT]` when no changes. |
| `run-monitor` | Every 5 minutes | Calls `run-watch` to check active registered runs. Reports only state changes, terminal states, or attention-required items. |
| `inbox-triage` | Daily at 09:00 | Searches for items with `status:0-inbox`, missing tags, missing collections, missing metadata. Generates a read-only report. |
| `library-hygiene` | Weekly on Monday | Scans for duplicate entries, orphaned items, empty collections, and data quality issues. |
| `attention-queue` | Daily at 18:00 | Combines attention queue insights with local index data to rank high-priority tasks. |

All non-interactive maintenance jobs use `[SILENT]` markers to avoid spamming the user when no actionable results are found.

## Security Boundaries

- The profile template (`profile.example.json`) never contains real tokens. Always use `ZOTERO_BRIDGE_TOKEN` as an environment variable.
- Maintenance cron jobs are read-only by default. Mutations require explicit user approval.
- Never read Zotero database files directly. Always use Host Bridge, `zotero-bridge`, and the local index produced from `library.sync_snapshot`.

## Next Steps

- [Host Bridge](host-bridge) — complete reference for the `zotero-bridge` CLI and Host Bridge capabilities
- [Workflows](../workflows) — overview of all built-in and custom workflows
- [MCP Server](mcp-server) — alternative protocol interface for MCP-compatible clients
