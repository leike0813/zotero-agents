---
name: zotero-librarian
description: Use when coordinating Zotero library inspection, synthesis context, workflow execution, and library maintenance through Host Bridge.
license: AGPL-3.0-or-later
---

# Zotero Librarian

Use this skill to operate the Zotero library through Host Bridge with a librarian posture: inspect first, keep evidence traceable, and apply changes only through reviewed mutation or workflow channels.

## First Steps

1. Read `references/operating-principles.md` for task-level command choice.
2. Use `references/host-bridge.md` for Host Bridge CLI commands and `references/workflows.md` for workflow catalog guidance.
3. Use `references/library-maintenance.md` for recurring maintenance routines.
4. Check `zotero-bridge bridge status` when Host Bridge availability is uncertain.

## Decision Rules

- For direct library facts, use `library`.
- For topic, graph, index, resolver, artifact, or insight context, use `synthesis`.
- For reusable multi-step behavior, inspect the workflow with `workflow describe`.
- For Host-owned execution, submit the workflow and monitor the returned `workflowRunId` with `run`.
- For agent-owned handoffs, treat `agentRunId` as the apply-back session handle, complete the returned requests, and apply them with `workflow agent-apply`.
- For writes, use preview/apply or workflow apply-back. Keep the preview or result bundle path in the task record.

## Run Handling

Use `run active` for a lightweight view of currently running, waiting, or recoverable failed Host-owned tasks. Use `run get <workflowRunId>` when you need the skill-run breakdown of a specific workflow run.

Interactive actions require `skillRunId`:

```powershell
zotero-bridge run skill reply <skillRunId> --message "..."
zotero-bridge run skill connect <skillRunId>
```

## Output Discipline

When reporting results, include the Zotero item keys, topic IDs, workflow IDs, run handles, artifact paths, or file-handle downloads that support the answer. If a command fails, report the structured error code and the next safe action.
