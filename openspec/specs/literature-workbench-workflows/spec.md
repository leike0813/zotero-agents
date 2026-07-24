# literature-workbench-workflows Specification

## Purpose

Specification for literature workbench workflow sequences, including digest analysis, tag regulation, and deep reading with per-step apply capabilities.
## Requirements
### Requirement: Literature digest automatic tag branch

`literature-analysis` SHALL support an optional ACP-only automatic tag-regulator branch.

#### Scenario: Automatic tag disabled

- **GIVEN** `auto_tag_regulator` is false
- **WHEN** literature-analysis builds its request
- **THEN** it emits a one-step `skillrunner.sequence.v1` request that runs the literature-analysis skill
- **AND** the digest step declares `apply_result` for `literature-analysis`.

#### Scenario: Automatic tag enabled

- **GIVEN** `auto_tag_regulator` is true
- **WHEN** literature-analysis builds its request
- **THEN** it emits a two-step sequence that runs literature-analysis and then tag-regulator in a reused workflow workspace
- **AND** both steps declare their own `apply_result` workflow.

#### Scenario: Tag branch failure does not prevent digest apply

- **GIVEN** the digest step succeeds and its step apply succeeds
- **WHEN** the tag-regulator step later fails
- **THEN** the digest notes and sidecar remain applied.

### Requirement: Literature deep reading cascaded apply

`literature-deep-reading` SHALL apply translator and deep-reading outputs at their owning sequence steps.

#### Scenario: Normal cascade applies translator before deep reading

- **GIVEN** no reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the translate step SHALL declare `apply_result` for literature-translator
- **AND** the deep_reading step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Shortcut applies only deep reading

- **GIVEN** a reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the request SHALL contain only the deep_reading step
- **AND** that step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Deep reading failure does not prevent translator apply

- **GIVEN** the translate step succeeds and its step apply succeeds
- **WHEN** the deep_reading step later fails
- **THEN** the translator Markdown and alignment JSON remain materialized.

### Requirement: Literature search ingest returns structured user-facing outcomes

`literature-search-ingest` SHALL return one final JSON object after ingest
completion or cancellation. The completed branch SHALL summarize the executed
search and retain one structured outcome for every important displayed
candidate.

#### Scenario: Completed ingest output is auditable

- **WHEN** `literature-search-ingest` finishes processing the user's candidate decisions
- **THEN** the final JSON SHALL include `kind: "literature_search_ingest"` and `status: "completed"`
- **AND** it SHALL include `searchSummary`, `outcomes`, and `searchLedgerPath`
- **AND** every approved candidate SHALL record `created`, `existing`, `failed`, or `not_attempted` as its ingest status
- **AND** PDF and metadata-curation status SHALL remain associated with the same candidate outcome.

#### Scenario: Search or ingest cannot continue

- **WHEN** the user cancels or rejects ingest, a required tool is unavailable, or execution cannot continue
- **THEN** the final JSON SHALL include `kind: "literature_search_ingest_canceled"` and `status: "canceled"`
- **AND** it SHALL include a structured reason and message instead of remaining pending.

#### Scenario: Skill requests ingest-time landing URL attachment

- **WHEN** the skill writes a per-paper `literature.ingest` payload
- **THEN** each payload SHALL set `paper.attachLandingUrlOnMissingPdf: true`.

### Requirement: Literature metadata curator SHALL update one parent item through preflight-aware metadata lookup

`literature-metadata-curator` SHALL run on exactly one selected parent item and SHALL update metadata through standard workflow `applyResult`.

#### Scenario: Local identifier lookup short-circuits provider dispatch

- **GIVEN** the selected parent item has a DOI, ISBN, or supported URL-derived identifier
- **AND** `skip_identifier_fast_path` is absent or `false`
- **AND** Zotero Translate Search returns a trustworthy metadata item for that identifier through the Host API metadata facade
- **WHEN** the workflow preflight runs under the precompiled package hook contract
- **THEN** preflight SHALL return `kind: "short-circuit-apply"`
- **AND** the short-circuit result JSON SHALL use `kind: "literature_metadata_curation"`
- **AND** provider dispatch SHALL NOT be required for that input unit.

#### Scenario: Explicit skip dispatches the metadata search skill

- **GIVEN** the selected parent item has a supported identifier
- **AND** `skip_identifier_fast_path` is `true`
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL NOT call the Host API or direct-runtime Zotero Translate Search
- **AND** `buildRequest` SHALL create one automatic `skillrunner.job.v1` request for `literature-metadata-search`
- **AND** the selected identifier SHALL remain in the request input as search context.

#### Scenario: Inconclusive local lookup falls back to SkillRunner

- **GIVEN** the selected parent item has no supported identifier, no translator, no returned item, or a mismatched candidate
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL return `kind: "continue"`
- **AND** `buildRequest` SHALL create one automatic `skillrunner.job.v1` request for `literature-metadata-search`
- **AND** the request input SHALL include the parent metadata snapshot, selected identifier when present, and preflight diagnostics.

#### Scenario: Apply uses the same result shape for local and fallback results

- **WHEN** `literature-metadata-curator` applies either a preflight result or a SkillRunner result
- **THEN** the apply hook SHALL consume canonical metadata from `metadata.itemType`, `metadata.fields`, and `metadata.creators`
- **AND** it SHALL only change between regular bibliographic item types
- **AND** it SHALL NOT mutate attachments, notes, annotations, tags, collections, or related items.

### Requirement: Literature metadata search skill SHALL reject container-title substitution

`literature-metadata-search` SHALL preserve the selected record's direct-work title unless evidence proves that a different title describes the same direct bibliographic work.

#### Scenario: Identifier-free chapter lookup finds a containing publication

- **GIVEN** the source record has no stable identifier and describes a chapter or contribution
- **WHEN** search finds only the containing book, proceedings volume, journal issue, or other container
- **THEN** the skill SHALL NOT emit that container title as `metadata.fields.title`
- **AND** it SHALL use the applicable container field only when supported by evidence.

#### Scenario: Identifier-free title or type correction has strong same-work evidence

- **GIVEN** the source record has no stable identifier
- **WHEN** the skill emits a changed title or `metadata.itemType`
- **THEN** the candidate SHALL be the same direct bibliographic work
- **AND** normalized title agreement, at least two independent corroborating signals, and authoritative landing-page evidence SHALL support the decision.

### Requirement: Literature metadata search skill SHALL be host-readonly

The `literature-metadata-search` skill SHALL search for bibliographic metadata without using Zotero Host Bridge write capabilities.

#### Scenario: Skill receives parent metadata only

- **WHEN** the fallback request is built
- **THEN** the skill input SHALL contain the selected parent metadata snapshot
- **AND** it SHALL NOT require source attachments.

#### Scenario: Skill output is canonical metadata JSON

- **WHEN** the fallback skill completes successfully
- **THEN** it SHALL output a JSON object with `kind: "literature_metadata_curation"`
- **AND** it SHALL include normalized metadata under `metadata.fields` and optionally `metadata.creators`.

### Requirement: Literature metadata search skill SHALL preserve authoritative Chinese creator names

For a direct bibliographic work originally published in Chinese, the skill SHALL
prefer the complete Chinese-character author list from an authoritative original
source over romanized or translated author names. This applies to articles,
conference contributions, books, theses, reports, preprints, and other supported
work types.

#### Scenario: Complete Chinese creator list is verified

- **GIVEN** the direct work's original publication language is Chinese
- **AND** an authoritative original source verifies the complete author list and order
- **WHEN** the skill emits `metadata.creators`
- **THEN** each personal author SHALL use the verified complete Chinese-character name in the single Zotero `name` field and preserve source order
- **AND** it SHALL NOT split a Chinese personal name into `firstName` and `lastName`
- **AND** it SHALL NOT substitute pinyin or translated names.

#### Scenario: Complete Chinese creator list cannot be verified

- **GIVEN** the direct work's original publication language is Chinese
- **AND** only romanized names or an incomplete Chinese author list can be verified
- **WHEN** the skill emits otherwise applicable metadata
- **THEN** it SHALL NOT infer or back-transliterate Chinese characters
- **AND** it SHALL emit an empty `metadata.creators` array so existing creators are preserved
- **AND** it SHALL include a warning with code `native_creator_names_unverified`.

#### Scenario: Chinese authors publish a non-Chinese-language work

- **GIVEN** the direct work's original publication language is not Chinese
- **WHEN** the skill evaluates creator names
- **THEN** author nationality, name, affiliation, or publication country alone SHALL NOT trigger Chinese-character replacement
- **AND** the skill SHALL preserve the officially published creator form.

### Requirement: Literature metadata search skill SHALL expose an automation-facing contract

The `literature-metadata-search` skill SHALL provide runner-readable schemas and instructions so it can be executed by workflows or injected agents without plugin-specific assumptions.

#### Scenario: Skill package declares runner and schema assets

- **WHEN** the skill package is inspected
- **THEN** it SHALL include `assets/input.schema.json`
- **AND** it SHALL include `assets/output.schema.json`
- **AND** it SHALL include `assets/runner.json`
- **AND** the runner metadata SHALL reference the input and output schema paths.

#### Scenario: Skill can run from generic source-record input

- **WHEN** an agent receives input matching `assets/input.schema.json`
- **THEN** it SHALL treat `input.parent` as the source bibliographic record
- **AND** it SHALL use optional `identifier` and `diagnostics` only as context
- **AND** it SHALL not require Zotero Host Bridge or workflow-local state.

#### Scenario: Low-confidence metadata is skipped

- **GIVEN** search returns no trustworthy candidate, multiple conflicting candidates, or only weak secondary evidence
- **WHEN** the skill completes
- **THEN** it SHALL output canonical JSON with `status: "skipped"`
- **AND** it SHALL leave `metadata.fields` empty
- **AND** it SHALL explain the reason through structured warnings.

### Requirement: Literature metadata search skill SHALL be injectable into ACP Chat

ACP Chat SHALL materialize the `literature-metadata-search` skill alongside the existing injected built-in skills.

#### Scenario: ACP Chat materializes metadata search skill

- **WHEN** an ACP Chat session prepares injected skills
- **THEN** the injected skill id list SHALL include `literature-metadata-search`
- **AND** the skill SHALL be copied into each resolved ACP Chat skill root when present in the plugin skill registry.

### Requirement: Literature search ingest SHALL expose search breadth and candidate outcomes
The final result SHALL expose a structured search summary, one outcome ledger, and a run-scoped search-ledger artifact rather than parallel success, missing-PDF, and failure arrays.

#### Scenario: Search result exposes candidate tier and curation need
- **WHEN** the interactive workflow completes
- **THEN** each admitted candidate outcome exposes its discovery tier, source trace, decision, ingest status, item reference when available, and `needsCuration`

### Requirement: Literature metadata curator SHALL protect authoritative original-script metadata
The curator SHALL treat translated and romanized titles and creators as matching evidence and SHALL NOT replace an existing authoritative original-script primary field unless a complete authoritative source in the same script supports the replacement.

#### Scenario: English translation does not replace Chinese title
- **WHEN** an exact identifier lookup returns only an English translated title for an item with an authoritative Chinese title
- **THEN** the curator preserves the Chinese title while allowing supported language-neutral fields to be filled

#### Scenario: Romanized creators do not replace native creators
- **WHEN** an identifier lookup returns an incomplete or romanized creator list for an item with authoritative native-script creators
- **THEN** the curator preserves the existing creators and emits a structured warning

### Requirement: Literature metadata curator SHALL preserve semantic field roles
The curator SHALL distinguish direct-work title, alternate title, journal title, book title, proceedings title, conference name, university, and institution before applying Zotero fields for the resolved item type.

#### Scenario: Container title cannot become work title
- **WHEN** a metadata source exposes only a journal, proceedings, or book container title
- **THEN** the curator does not write that value into the direct-work `title` field

### Requirement: Literature metadata curator SHALL close the curation-tag lifecycle
The curator SHALL remove `status:need-metadata-curation` after metadata is successfully applied or authoritatively verified as requiring no changes, and SHALL retain it for unresolved, conflicted, skipped, or failed results.

#### Scenario: Successful curation removes tag
- **WHEN** curation finishes as `applied` or `verified_no_change`
- **THEN** the workflow removes the status tag from the parent item

#### Scenario: Cleanup failure is partial
- **WHEN** metadata succeeds but tag removal fails
- **THEN** the workflow reports a cleanup warning without rolling back metadata and the tag remains available for retry

### Requirement: Workflow status transitions SHALL follow artifact ownership
Each participating builtin workflow MUST only remove the status that represents its own completed artifact, except MinerU which also establishes that PDF/fulltext input was available.

#### Scenario: Curator completes without a metadata change
- **WHEN** Curator verifies the existing metadata and performs no field mutation
- **THEN** it SHALL remove `need-metadata-curation`

#### Scenario: Manual PDF attachment occurs outside MinerU
- **WHEN** a user manually attaches a PDF
- **THEN** the plugin SHALL NOT automatically remove `need-fulltext`

#### Scenario: Translation or Explainer completes
- **WHEN** Translation or Literature Explainer applies a result
- **THEN** no builtin workflow status transition SHALL occur

### Requirement: Literature search ingest SHALL delegate one atomic research assignment per approved paper

`literature-search-ingest` SHALL begin subagent delegation only after the user has explicitly confirmed the Stage 30 ingest scope. The runtime SHALL create exactly one bounded research assignment for each candidate in the locked approved-candidate order. Each assignment SHALL be owned by one subagent and SHALL cover only that paper's bibliographic metadata resolution, lawful public-PDF research, and evidence reporting.

The worker-visible assignment SHALL be atomic. It SHALL NOT describe multiple internal stages, ask the worker to advance a global stage machine, or require an intermediate handoff to another worker.

#### Scenario: Work is not delegated before scope confirmation

- **GIVEN** the Stage 30 ingest scope has not been confirmed
- **WHEN** the gate determines the next action
- **THEN** it SHALL NOT expose research-assignment preparation or delegation
- **AND** no subagent SHALL write metadata, PDF, evidence, review-payload, or ingest artifacts.

#### Scenario: Confirmed candidates receive deterministic one-paper assignments

- **GIVEN** the user has confirmed an ordered list of ingestible candidates at Stage 30
- **WHEN** the main agent executes assignment preparation
- **THEN** the runtime SHALL preserve the locked approved order
- **AND** it SHALL create exactly one assignment for each approved candidate
- **AND** every assignment SHALL identify exactly one candidate and one issued result path
- **AND** repeated preparation for the same run state SHALL resolve to the same assignment-to-candidate mapping.

#### Scenario: A worker cannot expand or transfer its scope

- **GIVEN** a worker has received one assignment path
- **WHEN** it performs the assignment
- **THEN** it SHALL research only the identified candidate
- **AND** it SHALL NOT inspect or process another assignment
- **AND** it SHALL NOT delegate part of the assignment to another worker
- **AND** it SHALL NOT coordinate an intermediate handoff.

### Requirement: The static worker prompt SHALL have one source of truth in SKILL.md

The complete worker-visible role and execution prompt SHALL be written directly in `skills_builtin/literature-search-ingest/SKILL.md`. The prompt SHALL define one atomic bounded research assignment, one issued result path, the one-result completion rule, prohibited actions, stdout fallback, and immediate exit. No runtime-generated prompt SHALL redefine, extend, weaken, or compete with this contract.

The main agent SHALL dispatch a worker by copying the designated static prompt and substituting exactly one `worker_spec_path` at `{{WORKER_SPEC_PATH}}`. Dynamic candidate data, search limits, and output path SHALL remain in the assignment JSON rather than being copied into an ad hoc stage plan.

#### Scenario: Main agent substitutes only the worker spec path

- **GIVEN** the gate has returned an eligible assignment descriptor
- **WHEN** the main agent constructs the worker dispatch message
- **THEN** it SHALL use the designated static prompt from `SKILL.md`
- **AND** it SHALL substitute the descriptor's `worker_spec_path`
- **AND** it SHALL NOT improvise a worker role, global workflow sequence, project-script command, or continuation protocol.

#### Scenario: Runtime output remains data-only

- **WHEN** assignment preparation or gate evaluation returns worker dispatch data
- **THEN** each descriptor SHALL contain only `assignment_id`, `worker_spec_path`, and readiness status
- **AND** the spec SHALL contain only `assignment_id`, one approved `candidate`, `search_limits`, and `result_path`
- **AND** neither surface SHALL contain a generated delegation prompt, worker-executable script, gate action, finalizer, submission command, import command, Host receipt path, hash contract, or Zotero mutation command.

#### Scenario: Worker sees no global stage machine

- **WHEN** a worker reads its prompt and assignment file
- **THEN** neither surface SHALL instruct it to execute or transition among internal research or payload-authoring stages
- **AND** neither surface SHALL tell it to reread the global gate before completing its paper
- **AND** completion SHALL mean writing the issued result, returning its path, and exiting.

### Requirement: Every research assignment SHALL be minimal, contained, and finitely bounded

Each assignment SHALL be a read-only JSON document below `runtime/agent-batches/batch-NNN/spec.json`. Its `result_path` SHALL identify `runtime/agent-batches/batch-NNN/result.json` in the same contained assignment directory.

The assignment SHALL contain exactly four top-level members: `assignment_id`, one approved `candidate` snapshot containing its `candidate_id`, `search_limits`, and `result_path`. `search_limits` SHALL bound metadata queries/pages and PDF queries/pages. It SHALL contain no route graph, evidence schema, result schema version, aggregate workflow state, project-script path, executable command, internal stage label, submission authority, Host receipt location, or Zotero mutation authority.

#### Scenario: Assignment paths remain inside runtime

- **WHEN** the runtime prepares an assignment
- **THEN** both `worker_spec_path` and `result_path` SHALL resolve below the runner's `runtime/agent-batches/batch-NNN/` directory
- **AND** the worker SHALL NOT receive an external temporary, home-directory, or cache fallback
- **AND** a path escape SHALL fail closed.

#### Scenario: Search limits terminate the task

- **GIVEN** a worker has read one assignment
- **WHEN** it searches metadata and public-PDF sources
- **THEN** actual metadata queries/pages and PDF queries/pages SHALL remain within the assignment's hard upper bounds
- **AND** the worker SHALL stop early when sufficiently reliable metadata and a verified public PDF are available
- **AND** it SHALL stop when the applicable limits are exhausted rather than retrying indefinitely.

#### Scenario: Worker cannot write the shared path

- **GIVEN** the worker cannot write the issued `result_path`
- **WHEN** it has completed or terminated its bounded research
- **THEN** it SHALL return the same simple JSON object directly
- **AND** it SHALL exit without choosing another directory, running a project helper, or waiting for the main agent.

### Requirement: The gate SHALL expose the complete result-missing dispatch plan

After Stage 30 confirmation and assignment preparation, the gate SHALL return one ordered `dispatch_plan` containing every and only assignment whose issued result is not ready. Each descriptor SHALL identify the assignment, candidate, assignment path, result path, and readiness state. The gate SHALL NOT reduce the plan to a singleton next-assignment cursor.

The main agent SHALL dispatch the complete eligible set before it waits for an individual result or rereads the gate. An execution-environment concurrency limit MAY bound simultaneous workers, but it SHALL NOT turn assignment order into a gate-driven serial loop.

#### Scenario: Prepare returns every eligible assignment

- **GIVEN** three approved papers have three prepared assignments and none has a result
- **WHEN** the gate derives the dispatch action
- **THEN** `dispatch_plan.assignments` SHALL contain all three descriptors in approved order
- **AND** each descriptor SHALL contain only its own dynamic identifiers, paths, and readiness data
- **AND** the response SHALL NOT expose a singleton next-assignment cursor.

#### Scenario: Main agent dispatches before waiting

- **GIVEN** a dispatch plan contains multiple assignments
- **WHEN** the main agent begins delegation
- **THEN** it SHALL submit all plan members before entering a blocking wait for a specific result
- **AND** it SHALL NOT wait for assignment 001 and then reread the gate before submitting assignment 002
- **AND** an early result SHALL NOT defer another eligible assignment's dispatch.

#### Scenario: Workers do not participate in the readiness barrier

- **GIVEN** multiple assignments are running
- **WHEN** one worker writes its result
- **THEN** that worker SHALL return the path and exit
- **AND** it SHALL NOT poll another result path
- **AND** it SHALL NOT wait for all assignments
- **AND** only the main agent and runtime SHALL evaluate run-level readiness.

#### Scenario: Recovery returns the complete missing set

- **GIVEN** a prior dispatch round has reached terminal worker outcomes and two issued result paths remain missing
- **WHEN** the main agent reevaluates the gate
- **THEN** the next dispatch plan SHALL contain both missing assignments
- **AND** it SHALL exclude assignments whose result files are already present
- **AND** the main agent SHALL dispatch the complete recovery set before entering another wait.

### Requirement: Each worker SHALL write one lightweight flat research result and then exit

The worker SHALL write exactly one JSON object to the issued `result_path`. The object SHALL be a research handoff, not a formal runtime payload. It SHALL contain found bibliographic facts, an optional verified public PDF URL, source URLs, and concise notes about missing or uncertain information. It SHALL contain no stage envelopes, formal metadata/PDF route objects, manifests, coverage maps, confidence systems, checksums, hashes, executable commands, runtime submissions, ingestion instructions, or Host receipts.

The lightweight vocabulary SHALL support identity/status fields such as `candidate_id`, `status`, `item_type`, and `title`; simple bibliographic fields and creator names; explicit identifier and access fields; `source_urls`; and `notes`. Worker status SHALL be `resolved`, `partial`, or `unresolved`. Optional unknown facts MAY be omitted.

#### Scenario: Worker writes the minimum useful handoff

- **GIVEN** a worker has completed its bounded searches
- **WHEN** it writes `result.json`
- **THEN** it SHALL include only found facts, the final verified `pdf_url` when available, inspected `source_urls`, and concise `notes`
- **AND** it SHALL avoid complex nested semantic records and audit-only fields
- **AND** it SHALL return the result path and exit immediately.

#### Scenario: Raw abstract uses handoff terminology only

- **WHEN** a worker reports an evidence-backed abstract in the flat result
- **THEN** it SHALL use the raw handoff field `abstract_note`
- **AND** the main agent SHALL map that value to canonical `metadata.fields.abstractNote` only after review
- **AND** raw worker JSON SHALL NOT be treated as Zotero `itemData`.

#### Scenario: Unresolved research still terminates

- **GIVEN** identity or metadata remains uncertain within the search limits
- **WHEN** the worker finishes
- **THEN** it SHALL write `status: "unresolved"` with available source URLs and concise notes
- **AND** it SHALL NOT wait, poll the gate, start a repair stage, or submit a formal payload.

#### Scenario: Result presence cannot advance global state

- **WHEN** a worker result file appears at the issued path
- **THEN** it SHALL satisfy only the all-result scheduling barrier
- **AND** metadata, PDF, prepared ingest, and Host receipt state SHALL remain unchanged
- **AND** only a later main-agent formal review submission MAY advance canonical research state.

### Requirement: The main agent SHALL repair and validate each result before formal review submission

After every assignment has a result file, the gate SHALL expose one `review_agent_result` cursor at a time in locked approved order. The cursor SHALL provide the assignment id, raw result path, formal review payload path, `researchReviewPayload` schema reference/template, and submit command. The main agent SHALL inspect, repair, normalize, and validate that paper before submission.

Recoverable work MAY include discarding unsupported claims, checking cited source URLs, performing a small bounded repair search, normalizing item type and identifiers, converting reliable creator names, selecting the original-script title, mapping `abstract_note` to `abstractNote`, and constructing the required three-key formal PDF route object. The main agent SHALL NOT invent evidence, accept another material version silently, enlarge the approved scope, or delegate schema submission back to a worker.

#### Scenario: Main agent authors one formal review per paper

- **GIVEN** all worker result paths exist
- **WHEN** the gate returns `review_agent_result` for the next approved assignment
- **THEN** the main agent SHALL read that assignment and raw result
- **AND** it SHALL write one schema-valid formal review to the issued `payload_path`
- **AND** it SHALL execute the issued submit command and rerun the gate before the next review
- **AND** no raw worker result SHALL be submitted directly.

#### Scenario: Sparse or malformed research is repaired outside the worker

- **GIVEN** a raw result is sparse, malformed, contradictory, or available only in worker stdout
- **WHEN** the main agent reviews it
- **THEN** the main agent MAY preserve supported facts, write stdout JSON to the declared path, inspect sources, and perform bounded repair research
- **AND** it SHALL submit honest `not_attempted` metadata when identity cannot be verified
- **AND** it SHALL NOT require an original-worker repair stage, replacement-worker finalizer, or worker-side gate loop.

#### Scenario: Formal review failure stays with the main agent

- **WHEN** a formal review fails schema or semantic validation
- **THEN** canonical metadata, PDF, and prepared ingest state SHALL remain unchanged
- **AND** the main agent SHALL rerun the gate, repair only the issued formal payload, resubmit it, and rerun the gate
- **AND** the worker SHALL NOT be asked to interpret or submit the schema.

#### Scenario: Canonical ingest preparation follows all accepted reviews

- **GIVEN** every approved paper has a terminal accepted formal review
- **WHEN** the last review is admitted
- **THEN** the runtime SHALL deterministically create one canonical ingest payload for each metadata-qualified candidate
- **AND** unresolved candidates SHALL remain `not_attempted` without mutation payloads
- **AND** hash binding SHALL apply to canonical Host-input payload bytes, not worker specs or raw results
- **AND** Stage 70 SHALL remain closed until preparation is complete.

### Requirement: Literature search ingest SHALL serialize Zotero mutations through the main agent

Stage 70 `zotero-bridge mutation literature-ingest` commands SHALL be executed only by the main agent, one approved and formally submitted paper at a time. The global runtime SHALL bind each eligible mutation to its candidate, canonical ingest payload, and Host receipt location, and SHALL withhold the next mutation until the current terminal receipt has been recorded.

#### Scenario: Workers cannot mutate Zotero

- **WHEN** a worker performs an atomic research assignment
- **THEN** it SHALL NOT receive, execute, queue, simulate, retry, or monitor a Zotero mutation command
- **AND** it SHALL NOT receive a Host receipt path or library mutation authority
- **AND** its result SHALL contain research evidence only.

#### Scenario: Main agent executes one Host mutation at a time

- **GIVEN** the formal review payload has been accepted and Stage 70 begins
- **WHEN** the global runtime exposes the next eligible paper
- **THEN** the main agent SHALL invoke at most one `literature-ingest` mutation
- **AND** it SHALL wait for that invocation's terminal outcome and record its receipt
- **AND** it SHALL NOT invoke another paper mutation concurrently.

#### Scenario: Receipt is bound to the issued paper

- **WHEN** the main agent submits a Stage 70 Host receipt
- **THEN** the runtime SHALL verify that the receipt belongs to the eligible candidate and issued ingest payload
- **AND** it SHALL reject a wrong-path receipt, cross-candidate receipt reuse, or a receipt for a noneligible paper.

### Requirement: Literature search ingest SHALL enforce canonical Zotero metadata names before submission and ingestion

The formal review-payload schema SHALL define canonical metadata values as a closed contract. It SHALL accept Zotero-supported names including `abstractNote`, SHALL reject unknown aliases including `abstract`, and SHALL keep titles, creators, identifiers, PDF URLs, and attachment decisions in their designated structures.

Worker output SHALL be treated as untrusted research input. The main agent MAY normalize an unambiguous raw worker spelling during repair, but the formal review payload and final ingest payload SHALL contain only canonical field names.

#### Scenario: Canonical abstract field is accepted

- **WHEN** the main agent supplies a supported abstract as `abstractNote` in the formal review payload
- **THEN** schema validation SHALL accept the field when its value is valid and item-type compatible
- **AND** ingest-payload construction SHALL preserve it under the canonical Zotero field name.

#### Scenario: Noncanonical abstract alias is rejected

- **WHEN** a formal review or ingest payload contains `abstract`
- **THEN** schema validation SHALL reject the payload before runtime submission or Zotero mutation
- **AND** the invalid field SHALL NOT be deferred to Host Bridge.

#### Scenario: Dedicated values cannot be smuggled through a generic field map

- **WHEN** a generic metadata field map contains `title`, `DOI`, `doi`, `ISBN`, `creators`, `pdfUrl`, or `extra` despite those values having dedicated owners
- **THEN** schema validation SHALL reject the misplaced values
- **AND** the main agent SHALL project each accepted value through its designated formal and ingest structure.

#### Scenario: Canonical names remain item-type appropriate

- **WHEN** the main agent populates a canonical Zotero metadata field
- **THEN** the field SHALL be semantically compatible with the selected `itemType`
- **AND** canonical name membership alone SHALL NOT authorize an item-incompatible value.

### Requirement: Literature metadata search SHALL retain the canonical abstract field contract independently

`literature-metadata-search` SHALL validate its own canonical metadata output independently of the `literature-search-ingest` assignment runtime. Its metadata field contract SHALL accept `abstractNote` and reject `abstract`.

#### Scenario: Metadata search emits a canonical abstract

- **WHEN** `literature-metadata-search` returns trustworthy abstract metadata
- **THEN** it SHALL place the value in `metadata.fields.abstractNote`
- **AND** its output validation SHALL accept the canonical field.

#### Scenario: Metadata search rejects the noncanonical alias

- **WHEN** `literature-metadata-search` output contains `metadata.fields.abstract`
- **THEN** its output validation SHALL reject that payload
- **AND** no ingest-assignment runtime dependency SHALL be required to enforce the rejection.
