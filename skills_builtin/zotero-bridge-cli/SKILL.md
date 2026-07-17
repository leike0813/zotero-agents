---
name: zotero-bridge-cli
description: Use when an agent needs the Zotero Bridge CLI connection, exact machine-readable surface identity, command contract, or structured failure recovery.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

This wrapper owns CLI installation, connection, exact surface identity, and output/error contracts. For bounded Zotero task routing, use the `zotero-library-agent` Skill. For resident indexing, scheduling, monitoring, and maintenance, use the Zotero Librarian profile.

## Connect

- Prefer the run-local shim supplied by the current workspace.
- Preserve `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_ENDPOINT`, and `ZOTERO_BRIDGE_TOKEN`; never print token values.
- Use the bundled installer only when the run-local shim and PATH command are unavailable.
- Check `bridge status` before diagnosing authenticated profile or backend state.

## Verify The Exact Surface

Run `zotero-bridge surface identity --json` without connecting to Zotero. Compatibility requires the expected CLI version, build fingerprint, and command catalog checksum to match. SemVer alone is not a compatibility decision.

Use `zotero-bridge surface describe <command> --json` for argv, approval, typed handles, retryability, state-change, and recovery metadata. Use `zotero-bridge surface search --intent <intent> --json` when the canonical command is unknown.

## Control Invariants

Read `references/control-invariants.md` before using handles, approvals, file transfer, workflows, or writeback. Do not exchange `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `fileId`, and Zotero object refs.

## Output And Failure

Stdout is one JSON envelope. On failure, use `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and `nextCommand` before retrying. When apply-back status is uncertain, query `workflow agent-apply-status <agentRunId>`; never infer safety from an error message alone.

<!-- host-bridge-surface:wrapper-skill:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### CLI release check

- Run `<zotero-bridge> surface identity --json` before relying on a loaded command contract.
- Compare CLI schema, build fingerprint, and command catalog checksum with the release envelope shipped beside the current surface. SemVer alone is not compatibility evidence.
- If identity differs, stop and use the wrapper, CLI shim, and release envelope from one release set.

### Command families

- Prefer semantic CLI command families: bridge (backend list, backend status, manifest, profile diagnose, profile inspect, status); library (annotation export, annotation list, item attachments, item get, item notes, item search, items list, note get, note payload, note payloads, readiness audit, readiness missing-analysis, readiness missing-markdown, readiness missing-pdf, snapshot); synthesis (artifact export-filtered, artifact manifest, artifact read, artifact resolve-topic-digest, cache invalidate, cache status, concept query, graph get-layout, graph get-metrics, graph get-slice, graph overview, graph query-cluster, graph rank-external-references, graph rank-library-papers, graph refresh-metrics, index library get, index reference get, index status, insight attention-queue, resolver resolve, schema get, topic find-by-paper-ref, topic get-context, topic get-report, topic get-review-input, topic list); workflow (agent-apply, agent-apply-status, agent-run, describe, list, requirements, submit, validate); run (active, cancel, get, list, notification ack, notification list, notification wait, permission get, permission pending, recent, skill connect, skill events, skill get, skill recent, skill reply, workflow recent); mutation (apply, collection add-items, collection create, collection remove-items, item attach-file, item update, literature-ingest, note create, note update, note upsert-payload, preview, tag add, tag remove); file (download, upload); call; context (collection open, current, item open, note open, selection get, selection open); product (download, get, list, remove).
- Current graph/insight commands: synthesis graph get-layout, synthesis graph get-metrics, synthesis graph get-slice, synthesis graph overview, synthesis graph query-cluster, synthesis graph rank-external-references, synthesis graph rank-library-papers, synthesis graph refresh-metrics, synthesis insight attention-queue.
- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.
- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.
- Load only the relevant generated card under `references/commands/`; use `references/host-bridge-cli.md` for exhaustive capability diagnostics.

### Topic context payloads

- `synthesis topic get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--query` JSON.
- Omit `view` only when the flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge synthesis topic get-context --query '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Large response pagination

- Treat `response:paged` capabilities as one-page reads. Iterate the returned cursor metadata instead of assuming one call returns the whole collection.
- `synthesis graph overview` returns summary plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use `cursor`/`limit` for all sections together or section cursors such as `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor`.
- Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded subgraph, layout, or ranked metric page instead of the entire citation graph.
- `synthesis topic list`, `synthesis index library get`, graph metrics, and graph rankings are paged reads. Do not build workflows that rely on stdout containing every topic, index row, graph node, edge, or rank item in one response.

### Resolver payloads

- `synthesis resolver resolve` accepts direct resolver fields in `--query`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge synthesis resolver resolve --query '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge synthesis resolver resolve --query '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Unsupported fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

### Workflow payloads

- Use `workflow describe --workflow <id>` or `workflow requirements --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.
- `workflow submit` and `workflow validate` use `--selection <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows.
- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.
- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.
- Use `workflow agent-run --workflow <id> (--selection <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.
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

## References

- `references/identity-and-connection.md`: read before installation, profile selection, identity comparison, or connectivity diagnosis.
- `references/invocation-and-json-input.md`: read before constructing `--query`, `--input`, stdin, file, pagination, or output-path arguments.
- `references/commands/connectivity-context.md`: read for surface discovery, bridge diagnostics, current context, and navigation.
- `references/commands/library-items.md`: read for library search, deterministic item listing, item detail, notes, and attachments.
- `references/commands/library-notes-attachments-readiness.md`: read for note payloads, annotations, readiness audits, and snapshot paging.
- `references/commands/workflows-and-runs.md`: read before workflow selection, submit, agent handoff, apply-back, monitoring, interaction, or permission inspection.
- `references/commands/mutations-files-products.md`: read before mutation preview/apply, semantic writes, file transfer, or Product operations.
- `references/commands/synthesis-topics-artifacts.md`: read for topics, paper artifacts, Concept KB, and schema queries.
- `references/commands/synthesis-graph.md`: read for graph overview, slice, layout, metrics, clustering, ranking, and metric refresh.
- `references/commands/synthesis-index-resolver-insights.md`: read for indexes, resolver selectors, attention queues, and cache maintenance.
- `references/commands/diagnostics.md`: read only after ordinary bridge/profile/backend diagnostics cannot explain the problem.
- `references/output-and-recovery.md`: read after any failure, uncertain write, partial apply-back, paging interruption, or file-delivery problem.
- `references/host-bridge-cli.md`: exhaustive generated command and capability diagnostics.
- `references/control-invariants.md`: shared protocol-level safety facts.
- `references/agent-guidance.md`: connection, identity, and failure-recovery procedure.
- `references/terminology.md`: shared handle and Host Bridge terminology.
