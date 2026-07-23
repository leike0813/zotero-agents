# State and Recovery

## State ownership and schema

`scripts/zotero_librarian_service.py` exclusively creates and updates `state.sqlite`. The active schema marker is `zotero-librarian.state.v1`. Its owned data consists of:

- metadata including last successful index refresh;
- a library item projection keyed by library ID and item key;
- cached workflow definitions keyed by workflow ID;
- watched Zotero-managed runs keyed by `workflowRunId`;
- lightweight notifications keyed by event ID;
- the resident automation journal.

No Skill, cron file, shell snippet, external helper, or manual SQL session may create tables, alter schema, or write rows. The service enables foreign keys and initializes schema transactionally so concurrent first reads converge on one valid database.

The database is a rebuildable cache and journal. Live Zotero remains authoritative for UI context, library contents, workflow definitions, execution modes, runs, permissions, notifications, Products, files, operations, and writes.

## Freshness and atomic updates

Every cached conclusion carries the relevant refresh or update time. Use the cache for discovery and change detection; use a live read for externally visible current facts and every decision that can lead to a write or interaction.

Index refresh accepts all snapshot pages inside one transaction, upserts changed rows, removes rows absent from the completed snapshot, and records refresh time only on success. A page, parse, or transaction failure rolls back the new projection. Catalog refresh similarly commits each successful changed description without inventing definitions.

Run watch and notification sync update only accepted live results. Connectivity failure retains the last known state for later comparison. Do not erase old state, advance cursors from rejected data, or describe cached terminal/run/event values as current after a failed refresh.

## Recovery sequence

1. Preserve the failed receipt's operation, code, details, input path or handle, and the last usable local state.
2. If Zotero state may have changed, inspect the affected live object, workflow/run, operation, apply receipt, Product, file owner, or notification before choosing a retry.
3. For local corruption or an unavailable database, stop resident operations and preserve the damaged file for inspection when practical.
4. Initialize a fresh database only through the service; never repair tables manually.
5. Refresh the smallest projection required for the next decision: library index, workflow catalog, watched run registration/status, or notification inbox.
6. Re-run one bounded operation and compare its receipt with the preserved failure.

Rebuilding local state cannot replay lost Zotero writes and does not authorize submission, mutation, event acknowledgement, or apply-back.

## Handle and uncertain outcomes

Keep Zotero refs, `workflowRunId`, `skillRunId`, `agentRunId`, `operationId`, `permissionRequestId`, `eventId`, `fileId`, Product IDs, and plan paths in their own domains. Local row identity is not a replacement handle.

For an uncertain workflow submission, inspect matching live recent runs and locally watched entries before launching another plan entry. For an uncertain mutation or maintenance operation, query its durable receipt and live target. For an uncertain agent apply-back, delegate to Generic and inspect apply status; do not register the `agentRunId` as a watched workflow run.

When state changed or handle consumption is unknown, do not reuse the handle. When a local update succeeds after a remote call, the local commit proves only that the service recorded the returned result; live Zotero or the domain receipt proves the external effect.

For partial workflow-plan submission, retain launched runs and `remaining`. Remove neither group from the audit trail. A later pass needs a current operator instruction and must avoid resubmitting launched entries.

## Installation and profile recovery

Run `scripts/install_zotero_bridge_cli.py` during profile initialization. It installs the packaged executable and links the well-known connection profile without changing `HOME`. Use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME` only to locate the Zotero-side profile.

Before resident work, run the bundled CLI identity check and compare protocol, CLI schema, version, build fingerprint, and command-catalog checksum with the profile release identity. A version match alone is insufficient. Diagnose service, profile, authenticated manifest, and backend readiness in that order.

Credentials remain in the connection environment. Never write bearer tokens to `state.sqlite`, plan files, cron YAML, receipts, logs, evidence, or profile documentation. If executable/profile identities differ, select a matching packaged set rather than combining assets from separate releases.
