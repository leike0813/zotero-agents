# Resident Operations

## Service contract

Run `scripts/zotero_librarian_service.py` for every resident operation. Global options select the state database (`--db`), CLI executable (`--bridge`), or quiet unchanged output (`--quiet`). Each invocation initializes the local schema if needed, performs one bounded pass, emits one receipt, and exits.

The normal JSON shape is `zotero-librarian.operation-receipt.v1` with `operation`, `status`, `generatedAt`, and optional `summary` or `data`. A failed pass adds `error.code`, `error.message`, and optional `error.details`, prints JSON, and exits nonzero. `--quiet` renders only an `unchanged` receipt as `[SILENT]`; changed, attention, and failed results remain visible.

## Operation contract matrix

| Command | Reads | Local effect | Receipt data and meaning |
| --- | --- | --- | --- |
| `index refresh [--limit N]` | Paged live library snapshot | Atomically upserts current items, removes absent rows, stores refresh time | Counts `added`, `updated`, `deleted`, `total`; changed only for a projection delta |
| `index search <query> [--limit N]` | Local title and serialized item fields | None beyond schema initialization | `ok` with matching cached `items`; never implies Zotero changed |
| `index item <key-or-id>` | One local cached item | None | `ok` with cached `item`; missing cache entry is `item_not_found` |
| `index stats` | Local item count and refresh metadata | None | `ok` with `itemCount` and `lastRefresh` |
| `workflow catalog-refresh` | Live workflow list and changed descriptions | Atomically upserts changed catalog entries | Number of `updated` definitions |
| `workflow show <workflow-id>` | One cached workflow definition | None | `ok` with cached `workflow`; live describe is still required before execution |
| `run register --run-id ID --workflow-id ID [--state S]` | Supplied identifiers | Upserts one watched run | Registered `runId` |
| `run watch` | One live status read per non-terminal watched run | Updates changed run states | Current `runs`; unchanged means no transition |
| `notification sync [--limit N]` | One bounded unacknowledged event page | Upserts notification projection | `inserted`, `updated`, and `fetched` counts |
| `notification inbox [--limit N]` | Local unacknowledged events | None | `ok` with ordered `events` |
| `notification summary` | Local unacknowledged events | None | `ok` with counts grouped by event `type` |
| `notification ack --event ID [...]` | Live acknowledgement result | Marks named local events acknowledged | `acknowledged` event IDs |
| `maintenance workflow-status` | Local watched runs | None | Non-success candidates; `attention` when present |
| `maintenance library-hygiene` | Local repeated-title groups | None | Duplicate-title candidates; `attention` is a proposal |
| `synthesis attention-queue` | Live ranked attention queue | None | Queue `items`; never changes synthesis state |

Read-only lookups return `ok`. `changed` is reserved for a local projection/journal change or an explicitly launched remote operation. Neither status independently proves current Zotero state.

## Index and library questions

`index refresh` pages through the complete live snapshot and commits within one database transaction. It retains a previous usable projection when paging, parsing, or the transaction fails. Record the refresh receipt before using the projection for repeated discovery.

Use `index search` across cached titles, creators, identifiers, tags, collections, publication fields, and serialized item data. Use `index item` for a known key or numeric ID and `index stats` to judge projection size and refresh time. These operations accelerate discovery and ranking; they cannot establish current selection, attachment access, permission, workflow mode, Product existence, or writeback state.

For a library question, locate candidates locally, then invoke the inherited Query Skill and live CLI read appropriate to the claim. Report the cache query and refresh time when they influenced discovery, and cite live item keys or other current refs for the answer. If the question depends on changes newer than the projection, skip local certainty and perform the live read immediately.

## Workflow catalog and run supervision

Catalog refresh lists current workflows and fetches descriptions only for new or changed summary digests. `workflow show` is fast local discovery; execution still requires a live workflow description, current execution modes, input validation, and any provider-profile validation owned by Generic.

Interactive submission is not a resident service operation. Generic and the bundled CLI read the live workflow selection contract, preserve workflow options and provider-profile inputs separately, validate the complete request, and submit one reviewed scope. Host planning remains responsible for candidate production, filtering, and immutable unit grouping. The Zotero plugin's native queue is the sole owner of pending units and bounded admission.

Direct admission returns a real `workflowRunId`. Host-queue admission returns `submissionId`, per-unit `queueId` values, counts, and links; inspect that native projection until admitted tasks expose real run identities. Pending queue cancellation and admitted run cancellation are separate controls. A run created outside the resident service can be added with `run register`; use only a real `workflowRunId` and its workflow ID.

`run watch` checks each locally registered non-terminal Zotero-managed run once. It records transitions and naturally excludes terminal states from later active passes. It does not fetch transcripts, resolve permission decisions, execute self-owned handoffs, or infer missing Products and artifacts. Use live run/skill commands for interaction and the Generic handoff contract for `agentRunId` work.

## Notifications

Notification sync reads one bounded unacknowledged event page and upserts lightweight event payloads. Inbox and summary read the local projection. Use notifications to detect started, waiting, completed, failed, canceled, or recoverable lifecycle changes without long polling.

Before action, inspect the owning live workflow or skill run. Event text does not identify a reply/connect target unless the live run exposes the corresponding `skillRunId`, and it never grants approval or mutation authority. Acknowledge only after the action has been handled; failed live acknowledgement leaves the local event available for later review.

## Scheduled passes

The profile ships seven independent cron jobs: six-hour index refresh, daily workflow catalog refresh, five-minute run watch, five-minute notification sync, daily workflow-status triage, weekly library hygiene, and daily Synthesis attention queue. Each invokes the service with `--quiet`, performs one pass, and cannot submit or mutate Zotero.

Independent schedules keep one failure from hiding another domain's result. `unchanged` becomes `[SILENT]`; a changed local projection, attention candidate, or failure remains reportable. Triage, hygiene, and attention passes propose review work only. Any follow-up acquisition, curation, workflow submission, apply-back, or maintenance operation requires a new interactive task and its own authority.

## Completion evidence and failures

For a resident report, retain the operation receipt, relevant refresh time, item keys, workflow/run/event IDs, changed counts, attention reasons, and any live confirmation used in the user-facing conclusion. `attention` is complete when the review candidate and next safe check are clear; it is not completed remediation.

On a CLI or parse failure, the service emits a stable error and preserves committed state. Do not replace the projection with partial pages or advance a notification/run conclusion without a valid result. For an uncertain direct submission, inspect live recent runs before another call. For an uncertain queued submission, inspect the original native submission and submission-filtered tasks before another call. For local lookup failures, refresh only the needed projection and retry one bounded operation.

## Detailed operation cards

Use these cards after the Librarian `SKILL.md` has selected a resident operation. They describe service behavior and receipt interpretation; exact Zotero CLI mechanics remain in the bundled CLI Skill.

### `index refresh`

Purpose:

- Build a complete resident projection for change detection and repeated discovery.

Before:

- Confirm the intended library connection and whether the current cache is usable.
- Choose a page limit that bounds each request without truncating the full snapshot.

Command:

```sh
scripts/zotero_librarian_service.py index refresh --limit 200
```

Receipt:

- `changed` when rows were added, updated, or removed.
- `unchanged` when the completed snapshot matches the projection.
- Data reports `added`, `updated`, `deleted`, and `total`.

Next:

- Use live Query reads for externally visible current facts.
- On failure, retain the previous committed projection.

### `index search`

Purpose:

- Discover cached candidate items quickly from titles and serialized fields.

Command:

```sh
scripts/zotero_librarian_service.py index search "<query>" --limit 25
```

Receipt:

- `ok` with zero or more cached `items`.
- Results are candidates and carry the projection's freshness limit.

Next:

- Resolve relevant candidates through Generic Query and live Zotero reads.
- Do not claim absence or current state from the cache alone.

### `index item`

Purpose:

- Inspect one cached item by key or numeric ID during discovery or change comparison.

Command:

```sh
scripts/zotero_librarian_service.py index item <key-or-id>
```

Receipt:

- `ok` with one cached `item`.
- `failed` with `item_not_found` when no row matches.

Next:

- Use the stable ref for a live read before a current answer or write.

### `index stats`

Purpose:

- Inspect projection size and last successful refresh.

Command:

```sh
scripts/zotero_librarian_service.py index stats
```

Receipt:

- `ok` with `itemCount` and `lastRefresh`.

Next:

- Refresh when the planned discovery depends on newer changes.
- A recent timestamp does not prove an individual object is unchanged.

### `workflow catalog-refresh`

Purpose:

- Maintain a local discovery cache of current workflow definitions.

Command:

```sh
scripts/zotero_librarian_service.py workflow catalog-refresh
```

Receipt:

- `changed` with updated count when cached definitions change.
- `unchanged` when no catalog delta is detected.

Next:

- Use a live workflow list/describe before planning execution.

### `workflow show`

Purpose:

- Inspect one cached workflow candidate without claiming current availability.

Command:

```sh
scripts/zotero_librarian_service.py workflow show <workflow-id>
```

Receipt:

- `ok` with cached `workflow`.
- `failed` with `workflow_not_found` when absent.

Next:

- Delegate outcome selection to Generic and confirm the live description.

### Interactive native workflow handoff

Purpose:

- Validate and present one reviewable Zotero-managed request without creating resident queue state.

Command:

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

Before:

- Confirm the workflow is the correct Generic task candidate.
- Ensure the current selection is the intended raw input for the live candidate-production contract.
- Keep required options, provider profiles, no-selection, and self-owned mode within their declared Generic and CLI contracts.
- Validate the provider profile independently when the live description requires one.
- Choose a finite concurrency bound after considering provider limits, cost, unit independence, interaction, and apply-back duration.

Evidence:

- Live workflow identity and execution mode.
- Exact selection refs and separate `inputs` and `validateSelection` contracts.
- Reviewed workflow options and independently validated provider-profile input.
- Host candidate-production and immutable grouping behavior.
- Expected unit count or shape, result identities, and chosen native admission bound.

Next:

- Present the complete current scope without persisting an approval flag.
- Request current authority for that exact workflow, selection, options, provider, and concurrency.

### Native queue submission and supervision

Purpose:

- Submit one reviewed request and supervise direct or native-queue admission with typed handles.

Command:

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

Before:

- Confirm the current instruction authorizes the exact selection, options, provider profile, and concurrency.
- Remember that Zotero-side approval remains separate.
- Revalidate any live contract fact whose freshness affects the call.

Admission result:

- Direct admission exposes the real task and `workflowRunId`.
- Host-queue admission exposes `submissionId`, aggregate counts, queue links, and immutable unit projections.
- A queued response intentionally omits fictional run handles for pending units.
- Structured failure preserves state-change and safe-next-action facts.

Next:

- Inspect `workflow submission get <submissionId>` for aggregate and per-unit state.
- Use `workflow queue list` for active queue observation.
- Use `workflow queue cancel <queueId>` only while the unit is pending.
- Correlate admitted tasks through `run list --submission <submissionId>`.
- Register a real admitted `workflowRunId` only when resident one-pass watching is useful.
- Use run-plane interaction or cancellation after admission.
- Verify every expected Product, artifact, or Zotero change separately.
- Do not replay an uncertain submission or implement a resident reservation loop.
- Another submission requires a new current instruction.

### `run register`

Purpose:

- Add a known Zotero-managed workflow run created outside this helper.

Command:

```sh
scripts/zotero_librarian_service.py run register \
  --run-id <workflowRunId> --workflow-id <workflow-id> \
  --state running
```

Before:

- Verify the typed handle through a live workflow result.
- Never register `agentRunId`.

Receipt:

- `changed` with registered run ID.

Next:

- Use one-pass `run watch`.

### `run watch`

Purpose:

- Read each registered non-terminal run once and record transitions.

Command:

```sh
scripts/zotero_librarian_service.py run watch
```

Receipt:

- `changed` when at least one state transitions.
- `unchanged` when none transitions.
- Data lists current checked run states.

Next:

- Use live run/skill commands for interaction and output inspection.
- A terminal state is not Product, artifact, or write verification.

### `notification sync`

Purpose:

- Fetch one bounded unacknowledged lifecycle-event page into the local inbox.

Command:

```sh
scripts/zotero_librarian_service.py notification sync --limit 100
```

Receipt:

- `changed` when events are inserted or updated.
- `unchanged` when the fetched page adds no delta.

Next:

- Inspect the owning live run before action.

### `notification inbox`

Purpose:

- Read local unacknowledged events ordered by update time.

Command:

```sh
scripts/zotero_librarian_service.py notification inbox --limit 25
```

Receipt:

- `ok` with `events`.

Next:

- Resolve current run, skill, permission, or output state live.

### `notification summary`

Purpose:

- Count local unacknowledged events by type for a compact report.

Command:

```sh
scripts/zotero_librarian_service.py notification summary
```

Receipt:

- `ok` with grouped counts.

Next:

- Do not infer severity or required action from event type alone.

### `notification ack`

Purpose:

- Acknowledge named events after their associated action has been handled.

Command:

```sh
scripts/zotero_librarian_service.py notification ack \
  --event <event-id>
```

Before:

- Inspect live owning state.
- Complete or deliberately dismiss the required follow-up under current authority.

Receipt:

- `changed` with acknowledged IDs.

Failure:

- Keep the local event unacknowledged when the live acknowledgement fails.

### `maintenance workflow-status`

Purpose:

- Report watched runs whose state still needs review.

Command:

```sh
scripts/zotero_librarian_service.py maintenance workflow-status
```

Receipt:

- `attention` with run candidates.
- `unchanged` when none require review.

Next:

- Inspect live runs; do not retry or cancel automatically.

### `maintenance library-hygiene`

Purpose:

- Report repeated-title groups as possible duplicate candidates.

Command:

```sh
scripts/zotero_librarian_service.py maintenance library-hygiene
```

Receipt:

- `attention` with candidate groups.
- `unchanged` when none are found.

Next:

- Invoke Generic Curation for identity analysis and a reviewable proposal.
- Repeated title is never destructive authority.

### `synthesis attention-queue`

Purpose:

- Read the live ranked Synthesis attention queue without changing derived state.

Command:

```sh
scripts/zotero_librarian_service.py synthesis attention-queue
```

Receipt:

- `attention` with queue items.
- `unchanged` when the queue is empty.

Next:

- Delegate interpretation to Generic Synthesis.
- Diagnose any maintenance action separately.

## Library-question procedure

For “what is in my library?” or “what changed?”:

1. Inspect index stats.
2. Refresh when needed for the requested comparison.
3. Search the projection for candidates.
4. Delegate the bounded question to Generic Query.
5. Confirm relevant facts live.
6. Return the Generic business result plus resident refresh/change evidence.

For a negative answer, cache search is insufficient. Generic Query owns the complete live paging and evidence boundary.

For a question about a run or workflow, local cache is discovery only. Read the live workflow/run and verify requested outputs.

## Scheduled-pass interpretation

Each shipped cron calls exactly one operation with `--quiet`.

- `[SILENT]` means the operation returned `unchanged`.
- JSON `changed` means the local projection/journal changed, not necessarily Zotero.
- JSON `attention` means a review candidate exists.
- JSON `failed` means the pass did not complete.
- JSON `ok` is normally interactive read output and should not be mistaken for a delta.

Do not combine several cron domains into one hidden pass. Independent receipts make failure, attention, and recovery attributable to one state owner.

## Operation-level recovery examples

Index refresh fails on page four:

- prior projection remains usable;
- do not advance refresh time;
- retry a bounded refresh;
- do not merge three pages manually.

Workflow validation becomes stale:

- stop before the submit call;
- re-read the live workflow and selection;
- revalidate options and provider profile;
- do not reuse cached validation as current authority.

Queued submit response is uncertain:

- preserve `submissionId` and any returned `queueId` values;
- inspect the original submission projection and submission-filtered tasks;
- reconcile admitted real runs with watched state when useful;
- do not replay the selection or build a replacement resident batch automatically.

Notification acknowledgement fails:

- keep the local event visible;
- re-check owning action;
- retry acknowledgement only when the event still exists and the action remains handled.

Hygiene candidate is a false positive:

- record the live distinction;
- leave Zotero unchanged;
- do not suppress all future repeated-title candidates without a separate rule.
