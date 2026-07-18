# Workflow Execution Policy

Use this reference before preparing or submitting workflows.

## Selection

Workflow submission uses explicit selection. Read Zotero context when the user says "this paper", "selected items", or "current collection", then normalize note, attachment, and child item handles to top-level parent item refs before submitting. Use no-selection mode only for workflows whose contract accepts it.

Use:

```powershell
scripts/zotero_librarian_workflow_service.py parent-selection --from-context
scripts/zotero_librarian_workflow_service.py parent-selection --items .\items.json
```

## Provider Runtime Profile

A provider is the workflow runtime family; a backend is its configured concrete instance selected by `backendId`; and a provider profile is an external workflow preset supplied in a single Host Bridge request. The profile carries that backend selection and non-sensitive provider-specific options. Host Bridge validates it for the request and does not save or manage it.

For a pre-authorized ACP workflow, submit `{"providerOptions":{"autoApproveAcpPermissions":true}}` through the workflow provider profile. This controls ACP backend tool-permission handling only for that run. It is not Zotero write approval, `autoApproveZoteroWrites`, or a direct action on a pending permission request.

## Mode Choice

Use the structured `executionModes` returned by `workflow describe` or `workflow requirements`; do not infer support from workflow names, providers, or local prose.

Use Host-owned `workflow submit` when Host Bridge or the backend should own execution and expose a `workflowRunId`.

Use `$zotero-workflow-agent-runner` only when `executionModes.agentOwned.supported` is true. `workflow agent-run` cannot supply workflow options or provider profiles. The returned `agentRunId` is an apply-back session handle, not a run-control handle.

After an interrupted or failed apply-back, query `workflow agent-apply-status <agentRunId>` and follow the receipt. Do not reuse a consumed handle.

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
