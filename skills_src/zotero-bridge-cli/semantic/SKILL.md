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
