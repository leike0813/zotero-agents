---
name: zotero-bridge-cli
description: Use when an agent needs Zotero Bridge CLI access to Zotero library or synthesis context, workflow execution and monitoring, mutation or file writeback, exact surface identity and command contracts, or structured failure recovery.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

This wrapper owns CLI installation, connection, exact surface identity, semantic command contracts, typed handles, output interpretation, and structured failure recovery. For bounded Zotero task routing and evidence handoff, use the `zotero-library-agent` Skill. For resident indexing, scheduling, monitoring, and maintenance, use the Zotero Librarian profile.

## Operating Principles

1. Prefer the narrowest semantic command that represents the requested operation. Use raw `call` only for a raw-only capability or an explicit diagnostic investigation.
2. Start with bounded reads. Use explicit limits, preserve returned opaque cursors, and request graph slices or metric pages instead of assuming a complete library or graph fits one response.
3. Treat returned identifiers as typed handles. Never exchange `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `permissionRequestId`, `eventId`, `fileId`, Product ids, and Zotero object refs.
4. Use `context` to inspect or navigate Zotero's visible state. Navigation changes the visible target or selection; it does not mutate library data or authorize a write.
5. Diagnose from the outside in: exact surface, bridge health, connection profile, backend readiness, workflow requirements, then debug-only commands.
6. Read the target before a write. Preview open-ended mutations, then apply only through a semantic mutation, workflow apply-back, or another Host-owned approval path.
7. Decide whether Host Bridge owns workflow execution or the calling agent owns a handoff before issuing run-control commands.
8. Treat permission visibility as read-only. `run permission` explains pending state but cannot approve or reject a request.
9. Keep evidence sufficient to reproduce the conclusion: stable Zotero refs, run handles, artifact ids, output paths, checksums, and the relevant structured receipt.

## Connect

- Prefer the run-local shim supplied by the current workspace.
- Preserve `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_ENDPOINT`, and `ZOTERO_BRIDGE_TOKEN`; never print token values.
- Use the bundled installer only when the run-local shim and PATH command are unavailable.
- Check `bridge status` before diagnosing authenticated profile or backend state.
- Use `bridge profile inspect`, `bridge profile diagnose`, and `bridge backend ...` before retrying a profile-sensitive or backend-sensitive operation.

## Verify The Exact Surface

Run `zotero-bridge surface identity --json` without connecting to Zotero. Compare the expected CLI version, CLI schema, build fingerprint, and command catalog checksum. The generated release guidance explains how to explore a version difference without treating the version string alone as a hard blocker.

Use `zotero-bridge surface describe <command> --json` for argv, approval, typed handles, retryability, state-change, and recovery metadata. Use `zotero-bridge surface search --intent <intent> --json` when the canonical command is unknown.

## Provider Runtime Profiles

`--profile` and `ZOTERO_BRIDGE_PROFILE` select the Host Bridge connection profile; they do not select a workflow provider runtime. A workflow `provider` names the runtime family, `backendId` selects its configured backend, and `--provider-profile` supplies request-level non-sensitive `providerOptions` for that backend.

For an ACP workflow whose contract permits tool-permission automation, the calling agent may submit:

```bash
zotero-bridge workflow submit ... --provider-profile '{"providerOptions":{"autoApproveAcpPermissions":true}}'
```

`autoApproveAcpPermissions` applies only to that submitted ACP run. It does not grant Zotero write approval, configure `autoApproveZoteroWrites`, persist in Host Bridge, or approve a pending request shown by `run permission`.

## Workflow Ownership

- Use `workflow describe`, `workflow requirements`, and `workflow validate` to establish the input, provider, and execution-mode contract before starting uncertain work.
- Use `workflow submit` when Host Bridge should execute the workflow and return a `workflowRunId`. Monitor it with `run get`, `run active`, history, notifications, or skill-run events.
- Use `workflow agent-run` when the calling agent should execute prepared requests. Treat its `agentRunId` as an apply-back session handle, complete each `agentRequestId` contract, and submit the finished bundle with `workflow agent-apply`.
- Do not use run control-plane commands for an `agentRunId`. They control Host-owned workflow and skill runs.
- Treat `currentSkillRunId` as display and decision support only. Reply, connect, and event commands require an explicit `skillRunId` returned for the current task.
- Use a stable notification `client-id`, acknowledge handled events, and remember that notifications and skill-run events are lifecycle facts rather than transcripts or hidden interaction channels.

## Files And Remote Delivery

- Treat Host Bridge files as registered handles. Download an outbound `fileId` with `file download`; upload a local artifact before attaching it with `mutation item attach-file`.
- Do not pass an agent-local path as a Zotero attachment path. Preserve the returned checksum and byte count when exact artifact identity matters.
- For remote delivery, follow the returned delivery mode and download command. A Host-local path in an envelope is not evidence that the calling agent can read the file.

## Control Invariants

Read `references/control-invariants.md` before using handles, approvals, file transfer, workflows, or writeback. Do not exchange `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `fileId`, and Zotero object refs.

## Output And Failure

Stdout is one JSON envelope. On failure, use `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and `nextCommand` before retrying. When apply-back status is uncertain, query `workflow agent-apply-status <agentRunId>`; never infer safety from an error message alone.

- Retry the same command only when `retryable` is true and the current state still permits it.
- If `stateChanged` is true, query the relevant current state before deciding whether another write is necessary.
- If `handleConsumed` is true, do not reuse that handle.
- When a run is waiting for user input, locate its explicit `skillRunId` and use `run skill reply` only when the action is allowed.
- When a failed skill run advertises recovery, use `run skill connect` only for the returned `skillRunId` and permitted action.
- If a mutation or apply command is denied or invalid, report the structured code and safe next action; do not retry the write through raw `call`.

## Responsibility Boundary

The agent performs intent routing, semantic command choice, evidence interpretation, approval-aware decisions, and recovery judgment. Repository renderers own deterministic version insertion, command cards, schemas, copied references, and bundle layout. Do not hand-edit generated command inventories or machine-readable release artifacts.

<!-- host-bridge-surface:wrapper-skill:start -->
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
- `references/agent-guidance.md`: read for detailed command selection, readiness, pagination, writeback, workflow ownership, notifications, run interaction, maintenance, and evidence handling.
- `references/terminology.md`: shared handle and Host Bridge terminology.
