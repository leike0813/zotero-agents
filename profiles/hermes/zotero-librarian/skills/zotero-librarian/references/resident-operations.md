# Resident Operations

## Service contract

Run `scripts/zotero_librarian_service.py` for every resident operation. Global options select the state database (`--db`), CLI executable (`--bridge`), or quiet unchanged output (`--quiet`). Each invocation initializes the local schema if needed, performs one bounded pass, emits one receipt, and exits.

The normal JSON shape is `zotero-librarian.operation-receipt.v1` with `operation`, `status`, `generatedAt`, and optional `summary` or `data`. A failed pass adds `error.code`, `error.message`, and optional `error.details`, prints JSON, and exits nonzero. `--quiet` renders only an `unchanged` receipt as `[SILENT]`; changed, attention, and failed results remain visible.

## Operation contract matrix

| Command | Reads | Local effect | Receipt data and meaning |
| --- | --- | --- | --- |
| `index refresh [--limit N]` | Paged live library snapshot | Atomically upserts current items, removes absent rows, stores refresh time | Counts `added`, `updated`, `deleted`, `total`; changed only for a projection delta |
| `index search <query> [--limit N]` | Local title and serialized item fields | None beyond schema initialization | Matching cached `items`; changed means matches exist, not Zotero changed |
| `index item <key-or-id>` | One local cached item | None | Cached `item`; missing cache entry is `item_not_found` |
| `index stats` | Local item count and refresh metadata | None | `itemCount` and `lastRefresh` |
| `workflow catalog-refresh` | Live workflow list and changed descriptions | Atomically upserts changed catalog entries | Number of `updated` definitions |
| `workflow show <workflow-id>` | One cached workflow definition | None | Cached `workflow`; live describe is still required before execution |
| `workflow plan --workflow ID --from-context --output ABS` | Current selection and workflow validation | Atomically writes one deterministic plan file | Parent refs, embedded plan, and absolute `path` |
| `workflow submit --plan ABS --allow-submit [--concurrency N]` | Reviewed plan and live submit results | Registers launched runs | `launched` results and `remaining` entries |
| `run register --run-id ID --workflow-id ID [--state S]` | Supplied identifiers | Upserts one watched run | Registered `runId` |
| `run watch` | One live status read per non-terminal watched run | Updates changed run states | Current `runs`; unchanged means no transition |
| `notification sync [--limit N]` | One bounded unacknowledged event page | Upserts notification projection | `inserted`, `updated`, and `fetched` counts |
| `notification inbox [--limit N]` | Local unacknowledged events | None | Ordered `events` |
| `notification summary` | Local unacknowledged events | None | Counts grouped by event `type` |
| `notification ack --event ID [...]` | Live acknowledgement result | Marks named local events acknowledged | `acknowledged` event IDs |
| `maintenance workflow-status` | Local watched runs | None | Non-success candidates; `attention` when present |
| `maintenance library-hygiene` | Local repeated-title groups | None | Duplicate-title candidates; `attention` is a proposal |
| `synthesis attention-queue` | Live ranked attention queue | None | Queue `items`; never changes synthesis state |

Local read commands may return status `changed` because they returned data. Interpret the operation-specific data rather than assuming `changed` always means Zotero changed.

## Index and library questions

`index refresh` pages through the complete live snapshot and commits within one database transaction. It retains a previous usable projection when paging, parsing, or the transaction fails. Record the refresh receipt before using the projection for repeated discovery.

Use `index search` across cached titles, creators, identifiers, tags, collections, publication fields, and serialized item data. Use `index item` for a known key or numeric ID and `index stats` to judge projection size and refresh time. These operations accelerate discovery and ranking; they cannot establish current selection, attachment access, permission, workflow mode, Product existence, or writeback state.

For a library question, locate candidates locally, then invoke the inherited Query Skill and live CLI read appropriate to the claim. Report the cache query and refresh time when they influenced discovery, and cite live item keys or other current refs for the answer. If the question depends on changes newer than the projection, skip local certainty and perform the live read immediately.

## Workflow catalog and run supervision

Catalog refresh lists current workflows and fetches descriptions only for new or changed summary digests. `workflow show` is fast local discovery; execution still requires a live workflow description, current execution modes, input validation, and any provider-profile validation owned by Generic.

Resident planning resolves the current selection, normalizes notes and attachments to distinct top-level parent refs, validates the named workflow, and writes `zotero-librarian.workflow-plan.v1` to an absolute path. Inspect the persisted file rather than reconstructing it from terminal output. The plan contains one submission per parent and a default concurrency of one.

Submission launches only the first `--concurrency` entries in the reviewed plan during the current pass, records returned `workflowRunId` values, and reports the remainder. Later submissions require another current operator instruction. A run created outside the service can be added with `run register`; use only a real `workflowRunId` and its workflow ID.

`run watch` checks each locally registered non-terminal Zotero-managed run once. It records transitions and naturally excludes terminal states from later active passes. It does not fetch transcripts, resolve permission decisions, execute self-owned handoffs, or infer missing Products and artifacts. Use live run/skill commands for interaction and the Generic handoff contract for `agentRunId` work.

## Notifications

Notification sync reads one bounded unacknowledged event page and upserts lightweight event payloads. Inbox and summary read the local projection. Use notifications to detect started, waiting, completed, failed, canceled, or recoverable lifecycle changes without long polling.

Before action, inspect the owning live workflow or skill run. Event text does not identify a reply/connect target unless the live run exposes the corresponding `skillRunId`, and it never grants approval or mutation authority. Acknowledge only after the action has been handled; failed live acknowledgement leaves the local event available for later review.

## Scheduled passes

The profile ships seven independent cron jobs: six-hour index refresh, daily workflow catalog refresh, five-minute run watch, five-minute notification sync, daily workflow-status triage, weekly library hygiene, and daily Synthesis attention queue. Each invokes the service with `--quiet`, performs one pass, and cannot submit or mutate Zotero.

Independent schedules keep one failure from hiding another domain's result. `unchanged` becomes `[SILENT]`; a changed local projection, attention candidate, or failure remains reportable. Triage, hygiene, and attention passes propose review work only. Any follow-up acquisition, curation, workflow submission, apply-back, or maintenance operation requires a new interactive task and its own authority.

## Completion evidence and failures

For a resident report, retain the operation receipt, relevant refresh time, item keys, workflow/run/event IDs, changed counts, attention reasons, and any live confirmation used in the user-facing conclusion. `attention` is complete when the review candidate and next safe check are clear; it is not completed remediation.

On a CLI or parse failure, the service emits a stable error and preserves committed state. Do not replace the projection with partial pages or advance a notification/run conclusion without a valid result. For an uncertain submission, inspect live recent runs before launching again. For local lookup failures, refresh only the needed projection and retry one bounded operation.
