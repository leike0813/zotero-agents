---
name: zotero-bridge-cli
description: Manual for ZoteroBridge CLI. Use this skill when an agent needs to access the Zotero library.
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
- Keep `ZOTERO_BRIDGE_ENDPOINT`, `ZOTERO_BRIDGE_TOKEN`, and
  `ZOTERO_BRIDGE_CONNECTION_MODE` from the injected environment. The endpoint
  and connection mode override the profile template at runtime.
- Published CLI bundles install or upgrade through `install.ps1` on Windows and
  `install.sh` on POSIX. Agents should use `--yes --json` and must not pass a
  platform override.
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
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge --help
zotero-bridge bridge --help
zotero-bridge library --help
zotero-bridge synthesis --help
zotero-bridge workflow --help
zotero-bridge run --help
zotero-bridge mutation --help
zotero-bridge file --help
```

`bridge status` checks unauthenticated bridge health. `bridge manifest` is authenticated and
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

- Prefer semantic CLI command families: bridge (manifest, status); library (item attachments, item get, item notes, item search, items list, note get, note payload, note payloads, snapshot); synthesis (artifact export-filtered, artifact manifest, artifact read, artifact resolve-topic-digest, concept query, graph get-layout, graph get-metrics, graph get-slice, graph overview, graph query-cluster, graph rank-external-references, graph rank-library-papers, graph refresh-metrics, index library get, index reference get, insight attention-queue, resolver resolve, schema get, topic find-by-paper-ref, topic get-context, topic get-report, topic get-review-input, topic list); workflow (agent-apply, agent-run, describe, list, submit); run (active, cancel, get, list, skill connect, skill get, skill reply); mutation (apply, literature-ingest, preview); file (download).
- Current graph/insight commands: synthesis graph get-layout, synthesis graph get-metrics, synthesis graph get-slice, synthesis graph overview, synthesis graph query-cluster, synthesis graph rank-external-references, synthesis graph rank-library-papers, synthesis graph refresh-metrics, synthesis insight attention-queue.
- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.
- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.
- Full generated reference: `references/host-bridge-cli.md`.

### Topic context payloads

- `synthesis topic get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--input` JSON.
- Omit `view` only when a legacy flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge synthesis topic get-context --input '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Resolver payloads

- `synthesis resolver resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge synthesis resolver resolve --input '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge synthesis resolver resolve --input '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Legacy fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

### Workflow payloads

- Use `workflow describe --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.
- `workflow submit` uses `--items <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows; do not use legacy `--input`.
- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.
- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.
- Use `workflow agent-run --workflow <id> (--items <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.
- `workflow agent-run` does not accept workflow options, provider profiles, or agent-engine flags, and it does not start a Host backend task; the host only prepares request context for the handoff.
- `workflow agent-run` gates bundle creation only on `inputs`; `validateSelection` is returned as `applyStatus` advisory and is recalculated when apply-back is submitted.
- Use `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` after finalizing a SkillRunner-compatible output bundle from the handoff output contract.
- Agent-run apply-back is one-shot. Approval denial does not consume the agentRunId, but once applyResult starts the agentRunId cannot be reused.

### Runtime control payloads

- Use `run get <workflowRunId>` for workflow-level runtime status and known skill run projections.
- Use `run active` for the lightweight global active-task list; it excludes transcripts, local paths, and provider-private payloads.
- Use `run cancel <workflowRunId>` for workflow-level cancellation intent; cancellation does not imply immediate terminal state.
- Use `run skill get|reply|connect <skillRunId>` for explicit skill run interactions. Do not infer a skill run target from a workflow run id.
<!-- host-bridge-surface:wrapper-skill:end -->

## Remote Export Bundles

- With a remote profile, `synthesis topic get-context` with `outputPath` returns `delivery.mode="bridge-download"` instead of writing the caller path. Run `delivery.downloadCommand`, then run `delivery.unpackHint`.
- With a remote profile, `synthesis artifact export-filtered` returns the same kind of zip bundle. Treat `manifest_file` as a path inside the unpacked zip.
