# Design

## Progress State Boundary

`synt_job_state` becomes the latest-state table for Synthesis job progress. It
remains a Synthesis-owned table inside `state/zotero-agents.db`; generic plugin
state and debug profiler tables are not used for Workbench progress.

The schema migration is additive. Existing fields remain valid, while new
columns carry the UI-facing progress protocol:

- `run_id`, `source`, `label`
- `phase`, `phase_label`, `message`
- `started_at`, `completed_at`, `heartbeat_at`
- `total_count`, `progress_mode`, `progress_json`

`processed_count`, `skipped_count`, `failed_count`, `retry_attempt`,
`next_retry_at`, `diagnostics_json`, and `updated_at` keep their existing
meaning. Repository normalization treats missing new columns as empty values so
older test adapters and existing databases remain readable.

## Repository and Service API

The repository exposes typed job progress records and lifecycle methods:

- `upsertJobProgress(input)` starts or updates the latest progress row.
- `completeJobProgress(input)` finalizes a row with status `completed`.
- `failJobProgress(input)` finalizes a row with status `failed_retryable` or
  `failed_terminal`.
- `listActiveJobProgress()` returns recent running, queued, waiting, and failed
  rows for Workbench projection.
- `clearStaleJobProgress({ staleBefore })` prevents abandoned running jobs from
  staying active forever.

The service wraps those methods with small helpers so workers report business
progress rather than UI rows. A helper computes determinate progress when
`total_count > 0`; otherwise it records `progress_mode: indeterminate`.

## Worker Algorithms

Dirty-event workers use the already-selected pending event list as the
denominator. For batch workers, `total_count` is `min(pending.length,
batchLimit)`. Each attempted event increments `processed_count`; completed and
failed counters continue to reflect outcomes.

Startup reconcile begins as indeterminate while metadata fingerprints are being
loaded. Once the fingerprint array is known, it reports determinate scan
progress over that array and completes with the discovered dirty count.

Git Sync and literature registry rebuild use phase progress. Git Sync phases
are lock, export, copy, fetch, merge, validate, push, import, and cleanup.
Literature registry phases are source loading, rebuild, projection, and commit.
These are honest workflow phases, not paper-count estimates.

## Snapshot Projection

`service.ts` merges repository job progress rows into
`maintenance.backgroundJobs` before queue fallbacks. Job rows keep stable ids by
job name. When a precise backend progress row and a fallback row conflict, the
backend row wins because `uiModel.ts` already deduplicates by `job_id` and
prefers running/determinate rows.

The existing Workbench statusbar and popover continue to render the same
`SynthesisUiBackgroundJobProgress` shape. No new UI component contract is
introduced.

## Failure and Compatibility

Progress writes must not make the underlying worker fail. A progress reporting
failure is recorded as a diagnostic where possible and otherwise ignored, while
the worker continues to preserve current behavior.

The debug-only `jobProfiler` remains independent. It records historical timing
when debug mode is enabled; Workbench progress reads the production repository
state only.
