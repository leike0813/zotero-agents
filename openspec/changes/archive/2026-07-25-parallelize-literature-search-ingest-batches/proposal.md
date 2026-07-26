## Why

`literature-search-ingest` needs a post-confirmation delegation boundary that gives each approved paper to an independent subagent without exposing the Skill's global stage machine, project scripts, or submission protocol to that worker. Metadata resolution and public-PDF research are independent across papers and should run concurrently, while formal review-payload construction, runtime submission, and Zotero mutation require one main-agent owner. The same execution chain needs an explicit canonical metadata-field contract so formal payloads use Zotero-supported `itemData` fields such as `abstractNote` and reject invalid aliases such as `abstract` before any Host Bridge mutation is attempted.

## What Changes

- After the user confirms the Stage 30 ingest list, create exactly one bounded research assignment per approved paper and delegate each assignment to one subagent.
- Define the sole worker-visible delegation prompt directly in `SKILL.md`. The main agent combines that static prompt with one runtime-issued assignment-file path; runtime and gate responses provide only dynamic assignment data, result paths, readiness state, and scheduling data.
- Keep the worker contract atomic and stage-free: a worker reads one assignment, performs only the bounded metadata and public-PDF research authorized by that assignment, writes exactly one simple flat `result.json`, returns its path, and exits.
- Forbid workers from running project scripts, invoking gates or stage actions, executing finalizers, submitting formal payloads, importing runtime state, mutating Zotero, waiting for another assignment, or coordinating with another worker.
- Make the post-confirmation gate return one complete `dispatch_plan` containing every result-missing assignment. Require the main agent to dispatch all eligible workers, subject only to the execution environment's concurrency limit, before waiting for an individual result or rereading the gate.
- Keep assignment and result files under the runner working directory, preferably under `runtime/`, with one read-only assignment file and one issued result path per paper. Admission relies on direct path and schema validation; worker data contains no probes, script commands, manifests, or artifact hash chains.
- Keep result admission under the main agent: wait for all terminal worker results, then repair or normalize each paper's recoverable output, validate canonical metadata and PDF evidence, author that paper's formal review payload, and submit reviews through the global runtime in approved order.
- Keep Zotero ingestion deliberately serial: only the main agent may invoke `zotero-bridge mutation literature-ingest`, one approved paper at a time and without concurrent Host Bridge mutations.
- Define canonical formal-review and ingest metadata fields from one JSON Schema source of truth, accept Zotero fields including `abstractNote`, reject invalid or specially owned fields including `abstract`, and keep titles, identifiers, creators, attachment evidence, and PDF decisions in their dedicated payload locations.
- Verify that the independent `literature-metadata-search` contract emits `abstractNote` rather than `abstract` without coupling it to the ingest assignment runtime.
- Require the instruction surface to retain equal or greater operational depth while covering the atomic delegation, bounded-research, containment, validation, recovery, and canonical-field requirements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-workflows`: Define post-confirmation one-paper atomic research delegation, a static `SKILL.md` worker prompt, data-only runtime assignments, complete-plan dispatch, flat worker results, main-agent formal review submission, serial Stage 70 ingestion, and canonical metadata fields.

## Impact

- Affected built-in Skill: `skills_builtin/literature-search-ingest/`, including its execution instructions, static worker prompt, runtime action schema, runner metadata, gate and assignment helpers, formal review submission path, and operational references.
- Affected workflow package: `workflows_builtin/literature-workbench-package/literature-search-ingest/`, including the bundled workflow version and current execution documentation.
- Affected verification: the `literature-search-ingest` assignment, dispatch, worker-result, main-agent submission, and Stage 70 serialization tests, plus the independent `literature-metadata-search` metadata-field contract tests.
- Runtime integration uses the `zotero-bridge` CLI command surface and adds no Host Bridge API.
- No dependency installation, database migration, or new production service is required.
