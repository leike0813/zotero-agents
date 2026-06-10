---
name: zotero-bridge-cli
description: Use the Zotero Skills Host Bridge CLI for Zotero host access.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

Use this skill when an agent needs Zotero host access through the
`zotero-bridge` CLI. The CLI is the primary command-line broker for Zotero
Skills Host Bridge capabilities.

Read `references/host-bridge-cli.md` for the generated command, capability,
MCP mirror, debug, and safety reference. That reference is rendered from the
Host Bridge capability registry and Rust CLI source.

## Rules

- Prefer the run-local shim when it exists: Windows
  `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX
  `./.zotero-bridge/bin/zotero-bridge`.
- When another skill shows `<zotero-bridge>`, replace that placeholder with the
  run-local shim for the current OS. Use PATH command `zotero-bridge` only when
  the shim is absent.
- Read `ZOTERO_BRIDGE_PROFILE` when present. The profile points to the Host
  Bridge endpoint and usually references the bearer token through
  `auth.tokenEnv`.
- Never print, summarize, persist, or expose bearer token values.
- Parse stdout as exactly one JSON object. Check both the process exit code and
  the top-level `ok` field.
- Treat stderr as human-readable diagnostics only.
- Do not read Zotero databases, Zotero storage paths, plugin internals, or local
  attachment paths to bypass Host Bridge.
- Do not use MCP as a fallback for CLI failures unless the user explicitly asks
  for MCP diagnostics.

## Discovery

Run these commands first when the available surface is unclear:

```text
zotero-bridge status
zotero-bridge manifest
zotero-bridge --help
zotero-bridge item --help
zotero-bridge note --help
zotero-bridge topics --help
zotero-bridge citation-graph --help
zotero-bridge paper-artifacts --help
zotero-bridge insights --help
zotero-bridge workflow --help
zotero-bridge task --help
zotero-bridge file --help
```

`status` checks unauthenticated bridge health. `manifest` is authenticated and
lists the Host Bridge capabilities, workflow endpoints, file download support,
and CLI schema.

## Generated Summary

<!-- host-bridge-surface:wrapper-skill:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### Command families

- Prefer semantic CLI command families: item (attachments, get, notes, search); note (get, payload, payloads); topics (get-context, get-report, get-review-input, list); schemas (get); concepts (query); citation-graph (get-metrics, get-slice, overview, query-cluster, rank-external-references, rank-library-papers, refresh-metrics); library-index (get); resolvers (resolve); reference-index (get); paper-artifacts (export-filtered, manifest, read, resolve-topic-digest); insights (attention-queue); literature (ingest); workflow (list, run, submit); task (list); file (download).
- Current graph/insight commands: citation-graph get-metrics, citation-graph get-slice, citation-graph overview, citation-graph query-cluster, citation-graph rank-external-references, citation-graph rank-library-papers, citation-graph refresh-metrics, insights attention-queue.
- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.
- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.
- Full generated reference: `references/host-bridge-cli.md`.
<!-- host-bridge-surface:wrapper-skill:end -->
