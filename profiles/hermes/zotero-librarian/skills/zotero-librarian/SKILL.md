---
name: zotero-librarian
description: Use when coordinating Zotero library inspection, synthesis context, workflow execution, and library maintenance through Host Bridge.
license: AGPL-3.0-or-later
---

# Zotero Librarian

Use this skill to operate the Zotero library through Host Bridge with a librarian posture: inspect first, keep evidence traceable, and apply changes only through reviewed mutation or workflow channels.

## First Steps

1. Read `references/control-invariants.md` before using handles, approvals, files, workflows, or writeback.
2. Read `references/operating-principles.md` for profile-level command choice and resident maintenance posture.
3. Read `references/terminology.md` when the request uses shorthand such as graph, 三件套, digest, references, citation analysis, run handles, or writeback.
4. Read `references/workflow-execution-policy.md` before preparing or submitting workflows.
5. Use `references/common-tasks.md` for common literature, readiness, synthesis, and writeback task routing.
6. Use `references/host-bridge.md` for Host Bridge CLI commands and `references/workflows.md` for workflow catalog guidance.
7. Use `references/library-maintenance.md` for recurring maintenance routines.
8. Check `zotero-bridge bridge status` when Host Bridge availability is uncertain.
9. Compare `zotero-bridge --version` with the expected version in `references/host-bridge.md` when the loaded profile path, command help, or CLI error suggests a surface mismatch.
10. Use `zotero-bridge bridge profile inspect`, `zotero-bridge bridge profile diagnose`, and `zotero-bridge bridge backend ...` before retrying backend or profile-sensitive operations.

## Decision Rules

- For direct library facts, use `library`.
- For missing PDF, source Markdown, or literature-analysis artifact discovery, use `library readiness`.
- For the active Zotero pane, current selection, or UI navigation to known Zotero handles, use `context`.
- For topic, graph, index, resolver, artifact, or insight context, use `synthesis`.
- For reusable multi-step behavior, inspect the workflow with `workflow describe`.
- For scope-driven curation of an existing collection from literature already in the same library, submit the Host-owned `collection-collector` workflow with explicit workflow options rather than issuing inferred item-by-item collection mutations or using an optionless agent-run handoff.
- For draft workflow inputs, use `workflow requirements` or `workflow validate` before execution when readiness is uncertain.
- For Host-owned execution, submit the workflow and monitor the returned `workflowRunId` with `run`.
- For agent-owned handoffs, use `$zotero-workflow-agent-runner`; treat `agentRunId` as the apply-back session handle, complete the returned requests, and apply them with `workflow agent-apply`.
- For writes, use preview/apply, mutation-backed semantic commands, or workflow apply-back. Keep the preview, applied result, uploaded `fileId`, or result bundle path in the task record.

## Context Handling

Use `context current` or `context selection get` before acting on phrases like "this paper", "the selected notes", "the current collection", or "take me to that item". Use `context item open`, `context note open`, `context collection open`, or `context selection open` only with handles returned by Zotero or Host Bridge.

Context navigation changes what Zotero displays or selects. It is not a mutation channel and does not authorize metadata, note, tag, or file changes.

## Writeback Handling

For tag, collection, item field, note, payload, and attachment changes, inspect the target first and then use `mutation` commands. Upload local artifacts with `file upload` before attaching them with `mutation item attach-file`. Use `library annotation ...` commands for annotation reads and exports; annotation writes are not part of this surface.

## Run Handling

Use `run active` for a lightweight view of currently running, waiting, or recoverable failed Host-owned tasks. Use `run notification list` when you need callback-style lifecycle events. Use profile notification sync scripts for scheduled monitoring. Use `run get <workflowRunId>` when you need the skill-run breakdown of a specific workflow run.

Use `run recent`, `run workflow recent`, `run skill recent`, and `run skill events` for lightweight history and lifecycle/progress facts. These commands are not transcript access and do not imply an interaction target.

Use `run permission pending` and `run permission get` to inspect approval state. The CLI does not approve or reject permission requests.

Interactive actions require `skillRunId`:

```powershell
zotero-bridge run skill reply <skillRunId> --message "..."
zotero-bridge run skill connect <skillRunId>
zotero-bridge run notification ack --event <eventId>
```

## Output Discipline

When reporting results, include the Zotero item keys, topic IDs, workflow IDs, run handles, artifact paths, or file-handle downloads that support the answer. If a command fails, report the structured error code and the next safe action.

## Maintenance Handling

Use `synthesis cache status` and `synthesis index status` for read-only maintenance diagnostics. Use `synthesis cache invalidate` only for supported scopes and only when an approval-gated cache maintenance action is appropriate. Keep citation graph metric repair on `synthesis graph refresh-metrics`.

Use `scripts/zotero_librarian_notification_service.py sync` for non-blocking notification inbox refresh. Do not run long-polling waits from cron or from the agent loop.
