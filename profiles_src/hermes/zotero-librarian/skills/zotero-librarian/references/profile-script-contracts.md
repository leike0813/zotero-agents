# Profile Script Contracts

Profile scripts own deterministic paging, local SQLite updates, plan validation, and stable JSON output. The agent owns task interpretation, workflow/mode choice, evidence judgment, and approval decisions.

## Index service

```sh
scripts/zotero_librarian_index_service.py refresh
scripts/zotero_librarian_index_service.py search '<query>'
scripts/zotero_librarian_index_service.py item <key-or-id>
scripts/zotero_librarian_index_service.py stats
scripts/zotero_librarian_index_service.py workflow-refresh
scripts/zotero_librarian_index_service.py workflow-show <workflow-id>
scripts/zotero_librarian_index_service.py run-register --run-id <workflowRunId> --workflow-id <workflowId>
scripts/zotero_librarian_index_service.py run-watch
```

Refreshes and catalog updates are atomic. Search/item/stats are read-only. Run-watch performs one pass. On failure, scripts emit structured JSON and preserve the previous usable local state.

## Workflow service

```sh
scripts/zotero_librarian_workflow_service.py parent-selection --from-context
scripts/zotero_librarian_workflow_service.py plan --workflow <id> --mode host --items items.json
scripts/zotero_librarian_workflow_service.py submit --plan plan.json
```

The plan is the deterministic handoff between semantic choice and execution. Default concurrency is one; higher concurrency requires the explicit confirmation flag. Do not edit a submitted plan in place and claim it was validated.

## Notification service

```sh
scripts/zotero_librarian_notification_service.py sync
scripts/zotero_librarian_notification_service.py inbox
```

Both commands return without long polling. Sync persists accepted event pages; inbox reads the local projection. Neither command replies, connects, approves, or acknowledges on the agent's behalf.
