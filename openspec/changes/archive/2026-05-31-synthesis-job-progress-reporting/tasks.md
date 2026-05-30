## 1. OpenSpec Artifacts

- [x] 1.1 Create the `synthesis-job-progress-reporting` change.
- [x] 1.2 Add proposal, spec, design, and implementation tasks.

## 2. Repository Progress Protocol

- [x] 2.1 Add additive `synt_job_state` migration columns for job progress.
- [x] 2.2 Add typed job progress record normalization and repository lifecycle APIs.
- [x] 2.3 Extend the memory SQL adapter path used by tests for the new columns and queries.
- [x] 2.4 Add repository tests for upsert, complete, fail, list active, stale cleanup, and reset behavior.

## 3. Service Progress Projection

- [x] 3.1 Add service helpers for reporting progress without exposing UI row construction to workers.
- [x] 3.2 Project repository job progress into `maintenance.backgroundJobs`.
- [x] 3.3 Ensure backend progress rows override queue aggregate fallback rows for the same job.
- [x] 3.4 Add service/UI model tests for determinate, phase, indeterminate, failed, and stale rows.

## 4. Worker Algorithms

- [x] 4.1 Add bounded dirty-event progress to paper registry incremental worker.
- [x] 4.2 Add bounded dirty-event progress to citation graph structure and complex metrics workers.
- [x] 4.3 Add bounded dirty-event progress to topic freshness worker.
- [x] 4.4 Add startup reconcile progress that switches from indeterminate to fingerprint-count determinate progress.
- [x] 4.5 Add phase progress to literature registry rebuild.
- [x] 4.6 Add phase progress to Git Sync and preserve last phase on conflicts or failures.

## 5. Validation

- [x] 5.1 Run targeted repository, update event, Git Sync, and Workbench UI tests.
- [x] 5.2 Run `npx tsc --noEmit`.
- [x] 5.3 Run Prettier and ESLint checks for changed files.
- [x] 5.4 Run `npm run build`.
