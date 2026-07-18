## Why

The v4 ACP Workspace data plane removed several transcript amplification paths,
but presentation and replay still cross legacy state machines. Local child UI
actions can rebuild canonical state through old panel snapshots, owner changes
can retain regions from the previous owner, and profiler lifecycle evidence can
silently become incomplete while Replay reports execution completion.

## What Changes

- Replace the v4 publication vocabulary with a strict v5 region registry and one
  canonical browser state.
- Replace the partial ACP surface helper and Sidebar schedulers with one shared
  owner-scoped publication runtime.
- Remove Chat frontend/panel snapshots and Skills panel-snapshot materialization
  from ACP Workspace publication paths.
- Load one shared ACP child implementation for Chat and Skills, keeping local UI
  state separate from canonical publication state.
- Restore complete Chat navigation, Skills owner/banner semantics, and shared
  Host Bridge/Zotero MCP service status.
- Derive profiler and Replay lifecycle acceptance from one post-owned ledger,
  without metric-series loss changing correctness evidence.

## Capabilities

### Modified Capabilities

- `assistant-workspace-publication-data-plane`
- `assistant-workspace-ui-refresh-governance`
- `assistant-sidebar-ui`
- `acp-chat-performance-ui`
- `acp-chat-file-backed-transcript-state`
- `acp-skill-run-file-backed-runtime-state`
- `acp-runtime-performance-profiler`
- `acp-runtime-replay-profiler`

## Impact

This change affects the ACP Workspace publication contract, shared host runtime,
Chat and Skills adapters, Sidebar delivery, both ACP child documents, panel and
transcript projection, profiler/Replay lifecycle accounting, and their existing
tests and documentation. It does not change transcript persistence, JSONL/index
formats, external APIs, SkillRunner transport, dependencies, or user settings.
