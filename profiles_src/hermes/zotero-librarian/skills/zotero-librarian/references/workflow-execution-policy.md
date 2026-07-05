# Workflow Execution Policy

Use this reference before preparing or submitting workflows.

## Selection

Workflow submission uses explicit selection. Read Zotero context when the user says "this paper", "selected items", or "current collection", then normalize note, attachment, and child item handles to top-level parent item refs before submitting. Use no-selection mode only for workflows whose contract accepts it.

Use:

```powershell
scripts/zotero_librarian_workflow_service.py parent-selection --from-context
scripts/zotero_librarian_workflow_service.py parent-selection --items .\items.json
```

## Mode Choice

Use Host-owned `workflow submit` when Host Bridge or the backend should own execution and expose a `workflowRunId`.

Use `$zotero-workflow-agent-runner` when the workflow should hand work to the agent through `workflow agent-run`. The returned `agentRunId` is an apply-back session handle, not a run-control handle.

## Concurrency

ACP and SkillRunner backends may have model/provider concurrency limits. Default to one launched submission per invocation. Before launching more than one workflow for the same backend or provider group, ask the user for the concurrency number. If the answer is unclear, keep concurrency at 1.

The helper script enforces this default:

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json
```

Use a higher launch count only after confirmation:

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json --concurrency 2 --confirm-concurrency
```

## Monitoring

For Host-owned runs, store returned `workflowRunId` values and use short checks:

```powershell
scripts/zotero_librarian_notification_service.py sync
scripts/zotero_librarian_notification_service.py inbox
zotero-bridge run get <workflowRunId>
zotero-bridge run skill events <skillRunId> --limit 20
```

Do not use long-polling notification waits in the agent loop or scheduled jobs. Notification sync reads the inbox and returns.
