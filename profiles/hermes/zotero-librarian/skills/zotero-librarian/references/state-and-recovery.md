# State and Recovery

## State ownership and schema

`scripts/zotero_librarian_service.py` exclusively creates and updates `state.sqlite`. The active schema marker is `zotero-librarian.state.v3`. Its owned data consists of:

- metadata including last successful index refresh;
- a library item projection keyed by library ID and item key;
- cached workflow definitions keyed by workflow ID;
- watched Zotero-managed runs keyed by `workflowRunId`;
- lightweight notifications keyed by event ID;

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

Keep Zotero refs, `submissionId`, `queueId`, `workflowRunId`, `skillRunId`, `agentRunId`, `operationId`, `permissionRequestId`, `eventId`, `fileId`, and Product IDs in their own domains. A submission identifies one accepted native admission request, a queue ID identifies one unit while it is pending or projected, and a workflow-run ID identifies admitted execution. Local row identity is not a replacement handle.

For an uncertain direct workflow submission, inspect matching live recent runs before another call. For an uncertain native queued submission, inspect the original `submissionId`, its immutable units, submission-filtered tasks, and any locally watched admitted runs before submitting again. For an uncertain mutation or maintenance operation, query its durable receipt and live target. For an uncertain agent apply-back, delegate to Generic and inspect apply status; do not register the `agentRunId` as a watched workflow run.

When state changed or handle consumption is unknown, do not reuse the handle. When a local update succeeds after a remote call, the local commit proves only that the service recorded the returned result; live Zotero or the domain receipt proves the external effect.

For a partially admitted native submission, retain the submission handle, pending unit projections, admitted task/run handles, terminal units, failed units, and canceled units. The plugin owns those states; resident state must neither remove nor recreate them. Pending units continue under the accepted submission, while a separate later submission requires a new current operator instruction.

## Installation and profile recovery

Run `scripts/install_zotero_bridge_cli.py` during profile initialization. It installs the packaged executable and links the well-known connection profile without changing `HOME`. Use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME` only to locate the Zotero-side profile.

Before resident work, run the bundled CLI identity check and compare protocol, CLI schema, version, build fingerprint, and command-catalog checksum with the profile release identity. A version match alone is insufficient. Diagnose service, profile, authenticated manifest, and backend readiness in that order.

Credentials remain in the connection environment. Never write bearer tokens to `state.sqlite`, cron YAML, receipts, logs, command evidence, or profile documentation. If executable/profile identities differ, select a matching packaged set rather than combining assets from separate releases.

## Current state model

The database owns resident bookkeeping only. Use each table for one purpose.

### `meta`

Stores:

- active state Schema marker;
- last successful index refresh;
- local service metadata needed to keep resident reads fail-closed.

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

### Native submission observation boundary

Resident SQLite stores no workflow submission, pending queue unit, reservation, approval, or replay state. Those facts belong to the live Zotero plugin and are read through the Zotero Bridge surface.

The resident profile may observe:

- `submissionId` returned by the current interactive CLI call;
- immutable per-unit `queueId` values;
- aggregate submission counts and links;
- admitted task identities;
- real `workflowRunId` values after admission;
- terminal unit outcome and structured failure;
- Product, artifact, operation, or live-object evidence inspected separately.

The resident profile may persist only a real admitted run in `watched_runs` when one-pass supervision is useful. Registering that run does not copy its submission, queue position, selection, provider profile, options, or approval into resident ownership.

The resident profile never stores:

- a reusable workflow approval;
- an agent-generated workflow queue;
- pending-unit reservations;
- a next-entry cursor;
- a replay eligibility bit;
- a background worker lease;
- a locally reconstructed Host unit;
- a substitute aggregate submission state.

### Native handle ownership

| Handle | Owner | Meaning | Valid control plane |
| --- | --- | --- | --- |
| `submissionId` | Zotero native queue | One accepted host-queue submission and its immutable units | `workflow submission get`; submission-filtered task discovery |
| `queueId` | Zotero native queue | One projected unit, cancelable only while pending | `workflow queue list`; pending queue cancel |
| task identity | Host task runtime | One admitted unit's task lineage | Host task reads filtered by submission |
| `workflowRunId` | Zotero-managed execution | One admitted workflow run | Run status, cancellation, interaction, history, and events |
| `skillRunId` | Skill execution | One interactive skill target | Skill reply/connect |
| `agentRunId` | Self-owned handoff | One agent-owned request set | Agent handoff/apply contract, never watched runs |

Never derive one handle from another. Missing `workflowRunId` in a queued submit response is expected while units are pending; it is not an invalid handle and does not prove admission failure.

## Native submission identity

A queued submit result supplies the native identity needed for later observation:

- `admission: host-queue`;
- `submissionId`;
- total, pending, admitted/running, terminal, failed, and canceled counts as declared;
- queue and submission links;
- immutable unit projections containing `queueId` and source correlation;
- admitted task or run identities when available.

Treat `submissionId` as opaque. Preserve it exactly as returned and use it only with commands whose descriptor accepts that handle kind.

Treat each `queueId` as opaque. It remains useful for unit correlation after admission, but its state-changing cancellation action is valid only while the unit is pending.

Treat each admitted task/run identity as separately authoritative for execution. Aggregate submission state does not replace run transcripts, interactions, permissions, terminal detail, or result verification.

The initial submission response may be incomplete in time without being incomplete in contract. Pending units intentionally have no fabricated run identity. Re-read the same native submission rather than filling the gap from local inference.

## Native submission state transitions

Normal pending unit:

```text
pending
  -> admitted or running
  -> terminal success or terminal failure
```

Pending cancellation:

```text
pending
  -> canceled
```

Admission race:

```text
pending
  -> admitted
  -> queue cancellation conflicts
  -> run control owns later cancellation
```

Aggregate submission:

```text
accepted
  -> pending and/or admitted
  -> all units terminal or canceled
```

Apply-back slot lifetime:

```text
admitted
  -> workflow execution terminal
  -> apply-back terminal
  -> native slot released
```

The native queue owns every transition. Resident supervision observes the projection but does not advance it, reserve capacity, or launch the next unit.

### Direct admission

When the submit result declares direct admission:

1. Preserve the returned real task and `workflowRunId`.
2. Use the ordinary run plane immediately.
3. Register the run locally only if one-pass resident watching is useful.
4. Verify expected Products, artifacts, operations, and Zotero changes separately.
5. On uncertain transport, inspect current/recent matching runs before another submit.

Do not create a synthetic `submissionId` or queue unit for a direct run.

### Host-queue admission

When the submit result declares host-queue admission:

1. Preserve the returned `submissionId`.
2. Preserve every immutable unit and `queueId`.
3. Inspect the submission projection for aggregate and per-unit state.
4. Use queue list only to observe active units.
5. Cancel only a still-pending queue unit.
6. Discover admitted tasks by submission lineage.
7. Transfer execution supervision to the real run plane once a run handle exists.
8. Verify each expected output independently after execution and apply-back.

Do not create another submission because some units remain pending. They are already accepted work governed by the original concurrency bound.

### Uncertain observation

When a submit response or later read is uncertain:

- preserve any returned native handles and structured error;
- re-read the original submission when `submissionId` is known;
- query submission-filtered tasks for admitted work;
- inspect live recent runs when direct admission may have occurred;
- compare source refs and workflow identity before correlating a task;
- keep unrelated similarly timed runs separate;
- do not infer failure from a missing initial run handle;
- do not infer success from aggregate terminal state;
- obtain new authority only after the earlier effect is resolved.

Absence of resident rows does not prove absence of native work. Resident state is deliberately not the submission SSOT.

Active submission and queue projections are process-local. When Host restart makes a prior `submissionId` unavailable, inspect submission-filtered task lineage and real runs to recover units admitted before restart. Pending units that were never admitted are no longer observable as active queue work; retain the reviewed source scope in the interactive task evidence, report the unresolved remainder, and obtain current authority before a replacement submission. Never recreate pending units in `state.sqlite`.

## Failure classification matrix

| Failure | Possible remote effect | State | Safe next action |
| --- | --- | --- | --- |
| Missing current submission authority | None before call | No native submission | Obtain current exact-scope authority |
| Invalid selection/options JSON | None before call | No native submission | Correct declared inputs and validate again |
| Workflow contract changed | None in this call | Validation stale | Re-describe and revalidate |
| Selection revalidation fails | None in this call | Validation rejected | Resolve live selection and revalidate |
| Provider profile validation fails | None in this call | Provider rejected | Correct provider input independently |
| Concurrency below one | None before call | No native submission | Choose a positive bounded value |
| Direct submit returns valid run ID | Known admission | Real run exists | Monitor the returned run |
| Queue submit returns `submissionId` | Known accepted submission | Native units exist | Inspect the submission projection |
| Pending cancel succeeds | Known cancellation | Unit canceled | Preserve receipt and remaining units |
| Pending cancel conflicts after admission | Known ownership transition | Task/run owns unit | Re-read submission and use run control |
| Remote submit transport fails without handle | Unknown | Native effect uncertain | Inspect matching live tasks/runs before retry |
| Remote submit returns a submission handle then transport fails | Known identity, uncertain later state | Submission remains authoritative | Re-read that `submissionId` |
| Admitted task fails | Other units remain independently valid | Unit terminal failed | Preserve failure; continue bounded supervision |
| Apply-back remains active | Slot remains occupied | Unit not fully terminal | Wait through declared observation path; do not oversubscribe |
| No pending units | None from queue cancel | Existing native state retained | Inspect admitted/terminal units; do not resubmit |

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

### Native workflow submission

1. Preserve workflow ID, `submissionId`, unit `queueId` values, source refs, and structured failure.
2. Determine whether failure happened before the submit call, during admission, after a native handle returned, during execution, or during apply-back.
3. For local validation failure, correct the live selection/options/provider input and validate again before seeking authority.
4. For unknown queued effect, inspect the original submission projection and submission-filtered tasks.
5. For unknown direct effect, inspect active/recent matching runs using workflow and source identity.
6. Register a proven real run only through `run register`; do not hand-edit SQLite or manufacture lineage.
7. Never replay an accepted or uncertain submission merely because its initial response lacked run handles.
8. Pending units inside an accepted submission continue under native ownership and need no resident relaunch.
9. Obtain current authority before any distinct replacement submission.

### Maintenance candidate

1. Preserve candidate reason and refs.
2. Read live objects/model.
3. Delegate semantic diagnosis to Generic.
4. Produce a reviewable proposal.
5. Obtain current authority.
6. Verify any approved effect separately.

Candidate disappearance is a valid no-change outcome. It does not require compensating maintenance.

## Unknown-effect recovery

A transport or structured submit failure with unknown state means remote state may differ from local certainty.

Preserve:

- `submissionId` when returned;
- every returned unit `queueId`;
- unit ordinal and source refs;
- workflow ID;
- timestamp;
- bridge error;
- all admitted task and run IDs;
- aggregate counts and queue links;
- reviewed selection/options/provider/concurrency scope.

Inspect:

- the original native submission projection;
- submission-filtered admitted tasks;
- current/recent workflow runs for direct or admitted execution;
- selection/source identity;
- workflow-specific deduplication or submission evidence;
- watched-run cache;
- expected downstream Product/artifact only after locating a run.

Do not:

- submit the same reviewed scope again;
- recreate or reset a unit to pending;
- delete resident rows to force a submission path;
- create a replacement submission for the same source before reconciliation;
- infer failure from missing local run ID;
- infer success from a similarly timed unrelated run.

If no reliable match can be established, keep the submission effect unknown and report the need for operator review.

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
- unresolved native submission effects.

A fresh database improves future observation. It cannot erase or prove remote history.

## Recovery reporting patterns

Use:

> The index refresh failed before a complete snapshot was accepted. The prior projection remains available, but I will use live reads for current claims.

Use:

> The queued submission response became uncertain after its native handle was returned. I preserved the submission and unit identities, correlated any admitted runs, and will not issue a replacement submission until the original projection is reconciled.

Use:

> The cached workflow definition is available for discovery, but live describe changed, so the selection, options, provider profile, and requested concurrency must be reviewed and validated again before submission.

Use:

> The notification remains unacknowledged because its associated action was not successfully handled.

Do not use:

- “nothing happened” after a lost submit response;
- “safe to retry” without a receipt and live-state check;
- “database repaired” after ad-hoc SQL;
- “workflow complete” from a watched terminal state alone;
- “approved submission” for cached validation or resident state;
- “schedule restored” when only one pass ran.
