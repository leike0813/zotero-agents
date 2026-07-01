---
name: zotero-bridge-cli
description: Use when an agent needs ZoteroBridge CLI access to the Zotero library or Host Bridge, library or synthesis context, workflow submission or monitoring, or agent-owned workflow apply-back.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

Use this skill when the task needs Zotero library data, synthesis context, Host Bridge workflow execution, run monitoring, mutation preview/apply, or file-handle transfer through the `zotero-bridge` command.

The CLI is the contract boundary. Prefer commands documented in `references/host-bridge-cli.md` over raw capabilities. Use `call` only for diagnostics or for a capability that is explicitly raw-only.

## Operating Principles

1. Start with the narrowest read operation that can answer the question.
2. Treat Zotero item keys, topic IDs, workflow IDs, `workflowRunId`, `skillRunId`, `agentRunId`, and `agentRequestId` as opaque handles.
3. Keep writes inside `mutation preview`, `mutation apply`, or workflow apply-back paths that expose review and approval.
4. For workflow execution, decide whether Host Bridge owns the run or the agent owns the execution before issuing commands.
5. Do not infer a hidden interactive target from a workflow run. Reply and connect actions require `skillRunId`.
6. Do not assemble workflow result bundles by hand when `workflow agent-run` provides a prepared handoff contract.

## Runtime Setup

The published bundle includes `install.ps1`, `install.sh`, and `assets/profile.template.json`. Use `.\install.ps1 --yes --json` on Windows or `./install.sh --yes --json` on POSIX when the run-local shim is unavailable and the CLI needs to be installed for the current profile.

## Workflow Model

Use `workflow describe <workflowId>` before submitting a workflow whose input shape, output contract, or execution mode is uncertain.

Use `workflow submit` when Host Bridge should execute the workflow and produce a `workflowRunId`. Register and monitor only these Host-owned runs through the run control plane.

Use `workflow agent-run` when the agent should perform one or more requests locally and then return the result. The returned `agentRunId` is an apply-back session handle, not a backend run handle. Apply results with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`.

Use `run get`, `run active`, `run cancel`, and `run skill ...` for Host-owned workflow runs and skill runs. These commands do not monitor or complete agent-owned handoff sessions.

## Failure Handling

When a command fails, inspect the structured JSON error first. Retry only after the failure mode is clear: missing handle, invalid payload, unavailable Zotero state, waiting interaction, permission review, or backend recovery.

When a run is waiting for user input, use `run get` or `run active` to locate the `skillRunId`, then use `run skill reply <skillRunId> --message ...`.

When a run is failed and recoverable, use `run skill connect <skillRunId>` only when the returned actions indicate that connection is supported.

## Canonical Surface

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
- Omit `view` only when the flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge synthesis topic get-context --input '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Resolver payloads

- `synthesis resolver resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge synthesis resolver resolve --input '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge synthesis resolver resolve --input '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Unsupported fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

### Workflow payloads

- Use `workflow describe --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.
- `workflow submit` uses `--items <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows; do not use `--input`.
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

## References

- `references/host-bridge-cli.md`: command groups, endpoints, capabilities, and examples generated from the Host Bridge surface catalog.
- `references/agent-guidance.md`: command selection rules, workflow handoff rules, and failure-handling guidance for agents.

## Remote Export Bundles

When Zotero returns file handles, download them with `file download`. Preserve returned paths and checksums in task artifacts when the downstream skill needs to cite or reuse the exact exported file.
