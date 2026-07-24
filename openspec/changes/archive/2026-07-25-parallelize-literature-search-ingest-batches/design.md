## Context

`literature-search-ingest` is an interactive, gate-driven Skill with two user decisions: Stage 10 approves the search plan and Stage 30 approves the final ingest scope. After Stage 30 confirmation, each selected paper needs bounded metadata resolution and public-PDF research before the run can produce a formal review payload. Those research assignments are independent and benefit from subagent parallelism. Formal payload construction, runtime submission, and Stage 70 Zotero mutation remain global, stateful operations owned by the main agent.

The worker boundary must be smaller than the global Skill state machine. A subagent should not need to understand internal stage numbering, gate transitions, project helper scripts, submission commands, or Host mutation receipts. It should receive one paper, one bounded research contract, one result path, and one terminal obligation: write the result and exit.

The design preserves these boundaries:

- the JSON gate remains the global execution-state authority used by the main agent;
- no assignment is created or dispatched before explicit Stage 30 confirmation;
- exactly one subagent is assigned to each approved paper;
- the worker-visible prompt has one static source of truth in `SKILL.md`;
- gate and runtime outputs contain only dynamic assignment data, paths, readiness state, and scheduling data;
- delegated writes stay under the runner working directory, preferably under `runtime/`;
- every search route has an explicit attempt, request, or elapsed-time budget and a terminal outcome;
- workers do not run project scripts, submit payloads, import state, or mutate Zotero;
- the main agent owns result repair, canonicalization, validation, formal review-payload authoring, and submission;
- Stage 70 Host mutations remain one-paper-at-a-time main-agent operations;
- canonical Zotero metadata names are validated before formal submission and Host execution;
- modified Skill and reference instructions retain their operational depth.

## Goals / Non-Goals

**Goals:**

- Parallelize post-confirmation metadata and public-PDF research at one subagent per approved paper.
- Present every worker with one atomic, stage-free, bounded research assignment.
- Keep the static delegation prompt directly in `SKILL.md` and keep runtime responses data-only.
- Dispatch the complete result-missing assignment set before the main agent waits for an individual result.
- Use one simple flat `result.json` per paper with found facts, source URLs, and concise uncertainty notes.
- Make every worker assignment terminate as `resolved`, `partial`, or `unresolved` within the issued search limits.
- Let the main agent repair structurally recoverable worker output without inventing evidence or changing the approved scope.
- Submit one formal review payload per approved paper from the main agent after collection, repair, and validation.
- Preserve one-paper-at-a-time Zotero ingestion under main-agent ownership.
- Enforce canonical metadata fields, including `abstractNote` and excluding `abstract`.
- Verify `literature-metadata-search` independently follows the same canonical abstract-field rule.

**Non-Goals:**

- Exposing internal research or payload-authoring stage numbers to a worker.
- Giving a worker a gate command, stage action, finalization command, submission command, import command, or Zotero command.
- Allowing workers to coordinate with one another, wait for other assignments, or advance global execution state.
- Parallelizing `zotero-bridge mutation literature-ingest` calls.
- Allowing a worker to change the approved candidate list or author any formal review payload.
- Introducing a dynamic Zotero `ItemFields` lookup during the Skill run.
- Moving delegated artifacts to system temporary directories, home-directory caches, or other environment-dependent locations.
- Changing the external `literature-ingest` CLI request or response format.
- Coupling `literature-metadata-search` to the ingest runtime.
- Updating the published content feed as part of this change.

## Decisions

### 1. Treat Stage 30 confirmation as the only delegation boundary

The main agent creates no worker assignment until the gate has accepted the user's Stage 30 selection. It preserves the locked approved-candidate order and creates exactly one assignment for each approved paper. Assignment identity is stable within the run and maps to one candidate and one issued result path.

Each assignment covers the complete bounded research question for that paper: resolve trustworthy bibliographic metadata, probe lawful public PDF availability, preserve route-level evidence, and report a terminal outcome. The worker does not receive multiple internal stages or instructions to return to the gate between metadata and PDF work. This keeps local evidence together while removing worker-side coordination barriers.

The main agent may dispatch independent assignments concurrently. A worker cannot expand its scope to another candidate, split its assignment across other workers, or hand an intermediate result to another agent.

### 2. Keep the sole worker prompt as static instruction text in `SKILL.md`

`SKILL.md` contains the complete worker-visible role and execution contract. That static prompt tells the worker to:

- read the supplied assignment JSON path first;
- use only the candidate and search limits in that assignment;
- perform one bounded metadata and legal public-PDF research task;
- write exactly one simple result object to the issued `result_path`;
- return the path and exit immediately after the write;
- avoid all project scripts, gates, stage actions, finalizers, submissions, imports, Zotero commands, cross-worker coordination, and waits for external workflow state.

Runtime data does not contain an alternative delegation prompt, executable worker command, role description, or continuation instruction. The main agent copies the designated prompt and substitutes only the assignment spec path at `{{WORKER_SPEC_PATH}}`. Candidate facts, search limits, and output location remain in the assignment JSON; neither the main agent nor the gate adds a second stage plan or schema protocol.

### 3. Use a minimal data-only bounded assignment contract

Each assignment file is read-only worker input stored at the implementation's contained path:

```text
runtime/agent-batches/batch-NNN/spec.json
```

Its issued result path is in the same assignment directory:

```text
runtime/agent-batches/batch-NNN/result.json
```

The assignment contains exactly four top-level members:

- `assignment_id`;
- the one approved `candidate` snapshot, including its `candidate_id`;
- `search_limits` with `metadata_queries`, `metadata_pages`, `pdf_queries`, and `pdf_pages`;
- the contained `result_path`.

The search limits are hard upper bounds. A worker stops early when it has sufficiently reliable metadata and a verified public PDF, or stops when the applicable limits are exhausted. The static prompt and Skill references define identifier-first metadata research, lawful PDF-source priority, identity checks, and immediate exit. The assignment itself remains deliberately small and contains no project script path, command arguments, stage number, next-stage instruction, gate action, schema version, finalizer, submission token, import path, Host receipt path, hash contract, or Zotero mutation authority.

### 4. Dispatch every result-missing assignment before waiting

After assignments are prepared, the gate returns one `dispatch_plan.assignments` array containing the complete ordered result-missing set. Each descriptor contains only `assignment_id`, `worker_spec_path`, and readiness status. The main agent submits every descriptor before waiting for an individual worker or rerunning the gate. It must not run `paper-1 → wait → gate → paper-2`.

The all-result readiness barrier belongs to the main agent and runtime, not workers. Workers write and exit; they never poll the global gate or wait for another result. When the unified wait finishes, the main agent reruns the gate once. If result paths are still missing, the gate returns the complete remaining set for another launch round while preserving already written results.

The barrier checks result-file presence only. It does not validate or import raw research. Once every result path exists, the gate stops returning dispatch actions and exposes the first `review_agent_result` cursor in approved candidate order.

### 5. Keep the worker result simple and flat

Each worker writes exactly one lightweight JSON object. It is a research handoff rather than a runtime submission schema. Supported facts include:

- identity/status: `candidate_id`, `status`, `item_type`, and `title`;
- bibliographic values such as simple creator names, date, container fields, publisher/institution, language, and `abstract_note`;
- identifiers and access values such as DOI, ISBN, PMID, arXiv, landing URL, and verified public PDF URL;
- `source_urls` and concise `notes` for provenance, missing values, and uncertainty.

Worker status is `resolved`, `partial`, or `unresolved`. Unknown optional values may be omitted. The result does not contain stage envelopes, formal metadata/PDF route objects, manifests, coverage maps, confidence models, checksums, hashes, nested audit records, runtime actions, ingest commands, or Host receipts. `abstract_note` is only raw handoff terminology; the main agent maps a supported abstract to formal `metadata.fields.abstractNote`.

The runtime deliberately does not admit raw result semantics into global state. A malformed, sparse, or contradictory result can still satisfy the scheduling barrier and remains available for main-agent inspection and repair. This avoids trapping the worker in a schema/gate loop.

### 6. Keep repair, validation, and formal submission in the main agent

After every assignment has a result file, the gate exposes one approved candidate at a time through `review_agent_result`, returning its assignment id, raw result path, formal payload path, `researchReviewPayload` schema reference/template, and submit command. The main agent:

- reconciles the raw result with the locked candidate;
- discards guesses, wrong material versions, weak snippets, and mismatched PDFs;
- inspects cited source URLs and performs a small bounded repair search when decisive information is missing;
- normalizes item type, creators, identifiers, canonical Zotero field names, and PDF route outcomes;
- writes one formal review containing `metadata` and, only for qualified metadata, `pdf`;
- submits that review and reruns the gate before reviewing the next candidate.

The formal review is per paper, not one run-level aggregate. Raw worker results are never submitted separately and never copied directly into canonical payload paths. The main agent may submit honest `not_attempted` metadata when identity remains unresolved. It may not invent evidence, expand the approved scope, or ask the worker to run repair scripts or schema submission.

After all formal reviews are accepted, the runtime deterministically creates one canonical ingest payload per metadata-qualified candidate and binds only those canonical Host-input bytes by hash. Worker specs and raw results have no hash chain. Stage 70 remains unavailable until this projection is complete.

### 7. Keep Stage 70 Zotero mutation serial and main-agent-only

Only the main agent may execute `zotero-bridge mutation literature-ingest`. Stage 70 processes the approved and formally submitted papers in deterministic order, one mutation at a time. The next mutation is not executed until the current call reaches a terminal outcome and its Host receipt has been recorded through the global runtime.

Workers never receive a Zotero command, Host receipt path, library mutation token, or instruction to simulate, queue, retry, or monitor a Host mutation. Main-agent result repair and formal review submission also complete before Stage 70 begins.

### 8. Enforce canonical metadata names at the formal payload boundary

The formal review-payload schema is the structural source of truth for canonical metadata fields. It accepts `abstractNote` when compatible with the selected `itemType` and rejects aliases such as `abstract` before runtime submission or Host execution.

Fields with dedicated ownership stay in their dedicated locations: the authoritative title and creators are bibliographic values, identifiers use the designated DOI/ISBN/ISSN fields, and PDF URLs and availability evidence remain in the PDF decision structures until the main agent constructs the ingest request. Canonical field-name membership does not authorize a field that is semantically incompatible with the selected Zotero item type.

### 9. Verify `literature-metadata-search` independently

`literature-metadata-search` keeps its own lifecycle and output validation. Its contract is checked independently to ensure trustworthy abstracts use `abstractNote` and the noncanonical `abstract` alias is rejected. No dependency on the ingest assignment runtime is introduced solely to share orchestration.

### 10. Treat instruction thickness as a release gate

The modified `SKILL.md` and directly referenced operational documents are reviewed against fixed baseline commit `d5c149f0f3becba81f444b107c71157a6c155aa2`. Substantive instruction-line counts must not decrease, normalized prose characters must remain at least 95% of baseline, and semantic review must report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate instruction units.

Quantitative checks detect obvious thinning but do not authorize compression or removal. Review must preserve all search, metadata, PDF, evidence, user-decision, error, recovery, and Host-mutation guidance while expressing worker-visible orchestration through the atomic assignment contract.

## Risks / Trade-offs

- **[Risk] One subagent per approved paper increases scheduler and model load.** → Keep assignments independent, obey the execution environment's concurrency limit, fill available slots without serial gate loops, and retain main-agent ownership of global operations.
- **[Risk] The all-result barrier exposes the run to the slowest assignment.** → Give every assignment finite query/page limits, require terminal resolved/partial/unresolved output, and recover only the complete result-missing set rather than restarting successful work.
- **[Risk] A minimal result may omit decisive evidence.** → Require source URLs and concise uncertainty notes, then let the main agent inspect sources and perform a small bounded repair search before formal submission instead of expanding the worker result schema.
- **[Risk] Worker output may be syntactically valid but semantically inconsistent.** → Treat every result as untrusted research input and centralize repair, normalization, item-type checks, and formal payload construction in the main agent.
- **[Risk] A generated runtime prompt could drift from the Skill role boundary.** → Keep the sole static prompt in `SKILL.md`; runtime outputs only assignment data and paths.
- **[Risk] Contained result paths may still be unwritable in a particular agent environment.** → Keep paths under the runner working directory and let the worker return the same simple JSON object directly before exiting rather than redirecting to an external temporary directory.
- **[Risk] The explicit metadata allowlist can drift from future Zotero fields.** → Keep the allowlist in one schema source, test representative accepted and rejected keys, and update it deliberately when the supported contract changes.
- **[Risk] Detailed orchestration edits can accidentally thin unrelated Skill guidance.** → Enforce both thickness metrics and semantic parity review across the complete modified instruction surface.

## Implementation Plan

1. Define the minimal assignment, dispatch-plan, and formal review-payload contracts in the Skill runtime and schema; keep worker result shape instruction-guided rather than gate-admitted.
2. Put the complete static worker prompt in `SKILL.md` and remove worker-visible script, gate, stage, submission, import, and Host-mutation instructions from runtime-generated data.
3. Update the main-agent gate flow to prepare one assignment per approved paper, dispatch the complete result-missing set, collect terminal results, repair and validate them, and submit one formal review payload per paper.
4. Keep Stage 70 as the main-agent serial Zotero mutation boundary with terminal receipt recording.
5. Update the operational references and bundled workflow documentation at equal or greater instruction depth.
6. Extend focused tests for assignment cardinality, static-prompt ownership, data-only runtime output, bounded limits, full-plan dispatch, raw-result non-admission, worker prohibitions, main-agent review submission, canonical metadata, PDF early stop, and serial Host mutation.
7. Run syntax, focused contract, formatting, lint, whitespace, instruction-thickness, semantic-parity, and content-package consistency checks required by the repository.

## Open Questions

None. The Stage 30 delegation boundary, one-paper assignment cardinality, static prompt ownership, bounded worker contract, flat result shape, main-agent formal submission boundary, Stage 70 mutation ownership, and canonical metadata-field contract are fixed for this change.
