# State and Recovery

## State ownership and schema

`scripts/zotero_librarian_service.py` exclusively creates and updates `state.sqlite`. The active schema marker is `zotero-librarian.state.v2`. Its owned data consists of:

- metadata including last successful index refresh;
- a library item projection keyed by library ID and item key;
- cached workflow definitions keyed by workflow ID;
- watched Zotero-managed runs keyed by `workflowRunId`;
- lightweight notifications keyed by event ID;
- immutable workflow plan identities;
- per-plan-entry reservation, launch, and uncertain-effect state.

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

For partial workflow-plan submission, retain launched runs, pending entries, and unknown entries. Remove none from resident state. A later pass needs a current operator instruction and may submit pending entries only.

## Installation and profile recovery

Run `scripts/install_zotero_bridge_cli.py` during profile initialization. It installs the packaged executable and links the well-known connection profile without changing `HOME`. Use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME` only to locate the Zotero-side profile.

Before resident work, run the bundled CLI identity check and compare protocol, CLI schema, version, build fingerprint, and command-catalog checksum with the profile release identity. A version match alone is insufficient. Diagnose service, profile, authenticated manifest, and backend readiness in that order.

Credentials remain in the connection environment. Never write bearer tokens to `state.sqlite`, plan files, cron YAML, receipts, logs, evidence, or profile documentation. If executable/profile identities differ, select a matching packaged set rather than combining assets from separate releases.

## Current state model

The database owns resident bookkeeping only. Use each table for one purpose.

### `meta`

Stores:

- active state Schema marker;
- last successful index refresh;
- a fail-closed submission blocker when unclassified resident data requires attention.

It does not store user authority, current Zotero connection truth, workflow approval, or task conclusions.

### `library_items`

Stores:

- library ID and item key;
- numeric item ID;
- item type and title;
- serialized snapshot payload;
- content digest and local update time.

This projection supports discovery and change comparison. It does not prove current item state, attachment access, selection, or permissions.

### `workflow_catalog`

Stores:

- workflow ID;
- cached description payload;
- discovery digest and local update time.

It helps identify candidates. Live list/describe/validate remains authoritative before execution.

### `watched_runs`

Stores:

- real `workflowRunId`;
- workflow ID;
- last known state;
- accepted live payload;
- update time.

It is a one-pass watch cache. It does not own transcripts, permissions, Products, artifacts, or self-owned agent runs.

### `notifications`

Stores:

- event ID;
- associated workflow run ID;
- event type;
- local acknowledgement projection;
- payload and update time.

An event is a lifecycle hint. It is not a reply target, permission, or proof that its implied action occurred.

### `workflow_plans`

Stores:

- `planId`;
- canonical plan digest;
- workflow ID;
- live workflow-description digest captured at preparation;
- canonical plan JSON;
- registered absolute output path;
- aggregate state;
- default concurrency;
- creation, update, and first-submit times.

Aggregate states:

| State | Meaning |
| --- | --- |
| `prepared` | All entries validated and none reserved |
| `partial` | At least one entry launched and pending entries remain |
| `complete` | Every entry launched with a known run ID |
| `attention` | At least one entry has an uncertain remote effect |
| `invalid` | Immutable plan or live workflow contract no longer matches |

No state means “approved.” Authority is never persisted for reuse.

### `workflow_plan_entries`

Stores:

- plan ID and stable ordinal;
- exact item-ref JSON;
- entry digest;
- entry state;
- returned workflow run ID when known;
- submit receipt or stable error;
- creation and update times.

Entry states:

| State | Meaning | Automatic replay |
| --- | --- | --- |
| `pending` | Eligible only under a current authorized submit call | Allowed within that call |
| `launching` | Locally reserved before the remote request | Never |
| `launched` | Valid run ID returned and watched-run linkage persisted | Never |
| `unknown` | Remote effect may have occurred | Never |

When a new invocation finds stale `launching`, it converts it to `unknown`. Absence of a success response cannot prove absence of a remote run.

## Workflow plan identity

The plan file uses `zotero-librarian.workflow-plan.v2`.

Required identity fields:

- `planId`;
- `workflowId`;
- `createdAt`;
- `workflowDescriptionDigest`;
- `defaultConcurrency`;
- `submissions`;
- `planDigest`.

Canonical digest calculation:

1. Remove `planDigest`.
2. Serialize the remaining object as UTF-8 JSON with sorted keys and compact separators.
3. Compute SHA-256.
4. Store the hexadecimal digest in both file and database.

Submit verifies:

- absolute resolved path;
- readable JSON object;
- Schema identifier;
- required identity fields;
- recomputed digest;
- registered plan ID;
- registered digest;
- workflow ID;
- canonical JSON;
- registered output path;
- current workflow-description digest;
- live validation of each pending entry.

Any mismatch stops before a remote submit call.

Do not:

- copy a plan to another path and submit it;
- edit refs, workflow ID, concurrency, time, or digest;
- repair a digest after editing;
- use a plan generated from a different state database;
- interpret the file as authority.

Prepare a new plan from current live context instead.

## Submission state transitions

Normal entry:

```text
pending
  -> launching
  -> launched
```

Uncertain entry:

```text
pending
  -> launching
  -> unknown
```

Normal plan:

```text
prepared
  -> partial
  -> complete
```

Uncertain plan:

```text
prepared or partial
  -> attention
```

Invalid plan:

```text
prepared or partial
  -> invalid
```

The remote call occurs after the `launching` reservation is committed. A valid run result is recorded with the watched run in one local transaction. Later entry failure cannot roll back earlier launched-entry records.

## Failure classification matrix

| Failure | Possible remote effect | State | Safe next action |
| --- | --- | --- | --- |
| Missing `--allow-submit` | None | Plan unchanged | Obtain current authority |
| Relative/unreadable plan path | None | Plan unchanged | Use registered absolute file |
| Invalid JSON or Schema | None | Plan unchanged | Create a new plan |
| File/database digest mismatch | None | Plan unchanged or invalid | Do not edit; create a new plan |
| Workflow contract changed | None in this call | `invalid` | Re-describe and re-plan |
| Selection revalidation fails | None in this call | Plan unchanged | Resolve live selection and re-plan |
| Concurrency below one | None | Plan unchanged | Choose a positive bounded value |
| Remote submit returns valid run ID | Known launch | `launched` | Monitor the returned run |
| Remote submit transport fails | Unknown | `unknown`, plan `attention` | Reconcile live recent runs |
| Remote submit lacks run ID | Unknown | `unknown`, plan `attention` | Reconcile live recent runs |
| Process dies after reservation | Unknown | stale `launching` becomes `unknown` | Reconcile; never replay |
| Later entry fails | Earlier launches remain known | Failed entry `unknown` | Stop batch; preserve earlier runs |
| No pending entries | None | Existing state retained | Do not resubmit |

## Recovery sequence by domain

### Library projection

1. Preserve the failed refresh receipt and last usable database.
2. Determine whether failure occurred before complete snapshot acceptance.
3. Keep the prior refresh timestamp.
4. Run a new bounded complete refresh through the service.
5. Compare counts.
6. Use live item reads for current conclusions.

Never patch missing rows manually.

### Workflow catalog

1. Preserve the cached definition and refresh failure.
2. Use live workflow list/describe for the immediate decision.
3. Retry one catalog-refresh pass later.
4. Do not claim cached provider/readiness facts are current.

### Watched run

1. Preserve run ID, workflow ID, last state, and update time.
2. Read the live run.
3. Record a valid returned transition.
4. Inspect prompts, permissions, Products, artifacts, and writes through their own contracts.
5. Do not infer completion from local terminal state.

### Notification

1. Preserve event ID and owning run identity.
2. Inspect live owning state.
3. Perform the required action under its authority contract.
4. Acknowledge the named event.
5. Keep it unacknowledged when live acknowledgement fails.

### Workflow plan

1. Preserve plan path, ID, digest, workflow ID, and entry states.
2. Determine whether failure happened before or after entry reservation.
3. For local preflight failure, create a new plan if inputs need change.
4. For unknown remote effect, inspect active/recent matching runs.
5. Link a proven run only through a deliberate reconciliation implementation; do not hand-edit SQLite.
6. Never replay launched or unknown entries.
7. Obtain current authority for any remaining pending entries.

### Maintenance candidate

1. Preserve candidate reason and refs.
2. Read live objects/model.
3. Delegate semantic diagnosis to Generic.
4. Produce a reviewable proposal.
5. Obtain current authority.
6. Verify any approved effect separately.

Candidate disappearance is a valid no-change outcome. It does not require compensating maintenance.

## Unknown-effect recovery

An `attention` submit receipt means remote state may differ from local certainty.

Preserve:

- plan ID and path;
- entry ordinal;
- item refs;
- workflow ID;
- timestamp;
- bridge error;
- all previously launched run IDs;
- pending count.

Inspect:

- current/recent workflow runs;
- selection/source identity;
- workflow-specific deduplication or submission evidence;
- watched-run cache;
- expected downstream Product/artifact only after locating a run.

Do not:

- submit the same entry again;
- reset the entry to pending;
- delete the plan database row;
- create a new plan for the same source before reconciliation;
- infer failure from missing local run ID;
- infer success from a similarly timed unrelated run.

If no reliable match can be established, keep the entry unknown and report the need for operator review.

## Receipt-to-retry checklist

Before any retry, answer:

- Did the prior call have a possible remote effect?
- Is its state change known, unchanged, changed, or unknown?
- Was an input handle consumed?
- Does a durable receipt name a safe next action?
- Has the current target been read live?
- Would the retry duplicate an accepted page, upload, submit, mutation, acknowledgement, or apply-back?
- Does the current request still authorize the exact effect?

Retry only when all relevant answers make duplication impossible.

## State rebuild boundaries

Rebuildable:

- library projection;
- workflow catalog cache;
- watched-run rows when real run IDs are available;
- notification projection.

Not reconstructible from guesses:

- user authority;
- remote workflow submission effects;
- consumed handles;
- Products or artifacts not returned by their owner;
- prior Zotero mutations;
- self-owned apply-back receipts;
- unknown plan entry outcomes.

A fresh database improves future observation. It cannot erase or prove remote history.

## Recovery reporting patterns

Use:

> The index refresh failed before a complete snapshot was accepted. The prior projection remains available, but I will use live reads for current claims.

Use:

> Plan entry 2 is unknown after a transport failure. Entry 1 has a recorded workflow run, later entries were not launched, and no automatic replay will occur.

Use:

> The cached workflow definition is available for discovery, but live describe changed, so the prepared plan is invalid and must be rebuilt.

Use:

> The notification remains unacknowledged because its associated action was not successfully handled.

Do not use:

- “nothing happened” after a lost submit response;
- “safe to retry” without a receipt and live-state check;
- “database repaired” after ad-hoc SQL;
- “workflow complete” from a watched terminal state alone;
- “approved plan” for a persisted plan;
- “schedule restored” when only one pass ran.
