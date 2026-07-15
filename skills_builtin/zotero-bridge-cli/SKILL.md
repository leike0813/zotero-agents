---
name: zotero-bridge-cli
description: Use when an agent needs ZoteroBridge CLI access to the Zotero library or Host Bridge, library or synthesis context, workflow submission or monitoring, or agent-owned workflow apply-back.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

Use this skill when the task needs Zotero library data, current Zotero UI context, synthesis context, Host Bridge diagnostics, workflow execution, run monitoring, mutation preview/apply, note or item writeback, annotation export, or file-handle transfer through the `zotero-bridge` command.

The CLI is the contract boundary. Read `references/control-invariants.md` before using handles, approvals, files, workflows, or writeback. Prefer commands documented in `references/host-bridge-cli.md` over raw capabilities. Use `call` only for diagnostics or for a capability that is explicitly raw-only.

When the user uses Chinese shorthand, artifact names, run handles, graph terms, writeback terms, or domain abbreviations that could map to more than one Host Bridge concept, read `references/terminology.md` before choosing commands.

## Operating Principles

1. Start with the narrowest read operation that can answer the question.
2. Treat Zotero item keys, topic IDs, workflow IDs, `workflowRunId`, `skillRunId`, `agentRunId`, and `agentRequestId` as opaque handles.
3. Use `context current` or `context selection get` when the user's request depends on the active Zotero view, selected items, or where the user should be taken next.
4. Treat `context ... open` as Zotero UI navigation only. It does not write library data and it must target Zotero object handles returned by Zotero or Host Bridge.
5. Use `library readiness` before planning PDF retrieval, source Markdown conversion, or `literature-analysis` remediation. Readiness commands are read-only discovery, not repair.
6. Use `bridge profile inspect`, `bridge profile diagnose`, and `bridge backend ...` when availability, backend readiness, or profile compatibility is uncertain.
7. Inspect first, preview writes when the user has not already approved the exact operation, then apply through `mutation apply` or a mutation-backed semantic command.
8. For workflow execution, decide whether Host Bridge owns the run or the agent owns the execution before issuing commands.
9. Do not infer a hidden interactive target from a workflow run. Reply and connect actions require `skillRunId`.
10. Treat permission visibility as read-only. Use `run permission ...` to understand pending approval state; do not try to approve or reject from the CLI.
11. Do not assemble workflow result bundles by hand when `workflow agent-run` provides a prepared handoff contract.
12. Treat uploaded files as Host Bridge handles. Upload local artifacts with `file upload`, attach them with `mutation item attach-file`, and do not pass local paths as Zotero paths.
13. When the loaded skill path, generated reference, command help, or CLI error suggests a surface mismatch, check `<zotero-bridge> --version` against the expected version in the generated surface before choosing commands.

## Runtime Setup

The published bundle includes `install.ps1`, `install.sh`, and `assets/profile.template.json`. Use `.\install.ps1 --yes --json` on Windows or `./install.sh --yes --json` on POSIX when the run-local shim is unavailable and the CLI needs to be installed for the current profile.

Use the run-local shim first when it exists. If the observed `zotero-bridge` version differs from the expected version in the generated surface, prefer the workspace-injected skill and shim, then inspect `<zotero-bridge> --help` or `references/host-bridge-cli.md` beside that workspace copy before issuing task commands.

## Provider Runtime Profiles

`--profile` and `ZOTERO_BRIDGE_PROFILE` select the Host Bridge connection profile; they do not select a workflow provider runtime. A workflow `provider` is the runtime family, a `backendId` selects its configured backend, and `--provider-profile` is an external agent's request-level JSON preset for that backend and its non-sensitive `providerOptions`.

For an ACP workflow whose external preset authorizes ACP tool-permission automation, submit the option inline:

```bash
zotero-bridge workflow submit ... --provider-profile '{"providerOptions":{"autoApproveAcpPermissions":true}}'
```

This option applies only to the submitted ACP run. It neither grants Zotero write access nor configures `autoApproveZoteroWrites`, and it does not persist in Host Bridge. It is not a CLI command to approve or reject a pending permission request.

## Workflow Model

Use `workflow describe --workflow <workflowId>` or `workflow requirements --workflow <workflowId>` before submitting a workflow whose input shape, output contract, or execution mode is uncertain. Use `workflow validate` when you have a draft selection, workflow options, or provider profile and need to check readiness without starting a run.

Use `workflow submit` when Host Bridge should execute the workflow and produce a `workflowRunId`. Register and monitor only these Host-owned runs through the run control plane.

Use `workflow agent-run` when the agent should perform one or more requests locally and then return the result. The returned `agentRunId` is an apply-back session handle, not a backend run handle. Apply results with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`.

Use `run get`, `run active`, `run recent`, `run workflow recent`, `run skill recent`, `run skill events`, `run notification ...`, `run cancel`, and `run skill ...` for Host-owned workflow runs and skill runs. These commands do not monitor or complete agent-owned handoff sessions.

Use `run notification list --client-id <agentId>` or `run notification wait --client-id <agentId>` when you need a lightweight inbox of workflow and skill-run lifecycle events with a per-client best-effort cursor. Notification output is for progress awareness and callback-style handoff; it is not a transcript and is not a hidden interaction target.

Use `run skill events <skillRunId>` when you need lifecycle/progress facts for one skill run without starting a watch stream. Events are not transcripts and do not include workspace paths or provider private payloads.

Use `synthesis cache status` and `synthesis index status` for maintenance diagnostics. Use `synthesis cache invalidate` only for the supported enum scopes and only when the user or workflow has accepted an approval-gated maintenance operation.

## Failure Handling

When a command fails, inspect the structured JSON error first. Retry only after the failure mode is clear: missing handle, invalid payload, unavailable Zotero state, waiting interaction, permission review, or backend recovery.

When a run is waiting for user input, use `run get` or `run active` to locate the `skillRunId`, then use `run skill reply <skillRunId> --message ...`.

When a run is failed and recoverable, use `run skill connect <skillRunId>` only when the returned actions indicate that connection is supported.

After handling a notification, acknowledge it with `run notification ack --client-id <agentId> --event <eventId>` so later checks can focus on new events.

For library writeback, prefer mutation-backed commands such as `mutation tag add`, `mutation item update`, `mutation note create`, and `mutation item attach-file` after the target item or note has been read. If an apply command returns an approval or validation error, report the structured code and stop rather than retrying with `call`.

## Canonical Surface

<!-- host-bridge-surface:wrapper-skill:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### CLI release check

- Expected `zotero-bridge` CLI version for this generated surface: `0.2.1`.
- Confirm with `<zotero-bridge> --version` when the loaded skill or reference path is uncertain, command help does not match this surface, or a CLI error points to command shape mismatch.
- If the observed version differs from the expected version, stop using this loaded skill copy for command syntax. Prefer the workspace-injected skill and run-local shim, then inspect `<zotero-bridge> --help` or the generated reference beside that workspace copy.

### Command families

- Prefer semantic CLI command families: bridge (backend list, backend status, manifest, profile diagnose, profile inspect, status); library (annotation export, annotation list, item attachments, item get, item notes, item search, items list, note get, note payload, note payloads, readiness audit, readiness missing-analysis, readiness missing-markdown, readiness missing-pdf, snapshot); synthesis (artifact export-filtered, artifact manifest, artifact read, artifact resolve-topic-digest, cache invalidate, cache status, concept query, graph get-layout, graph get-metrics, graph get-slice, graph overview, graph query-cluster, graph rank-external-references, graph rank-library-papers, graph refresh-metrics, index library get, index reference get, index status, insight attention-queue, resolver resolve, schema get, topic find-by-paper-ref, topic get-context, topic get-report, topic get-review-input, topic list); workflow (agent-apply, agent-run, describe, list, requirements, submit, validate); run (active, cancel, get, list, notification ack, notification list, notification wait, permission get, permission pending, recent, skill connect, skill events, skill get, skill recent, skill reply, workflow recent); mutation (apply, collection add-items, collection create, collection remove-items, item attach-file, item update, literature-ingest, note create, note update, note upsert-payload, preview, tag add, tag remove); file (download, upload); context (collection open, current, item open, note open, selection get, selection open); product (download, get, list, remove).
- Current graph/insight commands: synthesis graph get-layout, synthesis graph get-metrics, synthesis graph get-slice, synthesis graph overview, synthesis graph query-cluster, synthesis graph rank-external-references, synthesis graph rank-library-papers, synthesis graph refresh-metrics, synthesis insight attention-queue.
- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.
- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.
- Full generated reference: `references/host-bridge-cli.md`.

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

- `references/host-bridge-cli.md`: command groups, endpoints, capabilities, and examples generated from the Host Bridge surface catalog.
- `references/control-invariants.md`: shared handle, authority, workflow ownership, file-transfer, privacy, and writeback rules.
- `references/agent-guidance.md`: command selection rules, workflow handoff rules, and failure-handling guidance for agents.
- `references/terminology.md`: shared Host Bridge and Zotero Librarian terminology for graph, artifact, handle, readiness, and writeback concepts.

## Remote Export Bundles

When Zotero returns file handles, download them with `file download`. Preserve returned paths and checksums in task artifacts when the downstream skill needs to cite or reuse the exact exported file.

When an agent needs to return a local artifact to Zotero, upload it with `file upload` and use the returned `fileId` in a writeback mutation. The upload handle is short-lived and may be consumed by attach.
