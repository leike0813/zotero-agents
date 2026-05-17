# synthesize-topic-workflow Delta

## MODIFIED Requirements

### Requirement: Topic synthesis workflow result bundles are validated

Topic synthesis create and update workflows SHALL produce verifiable result
bundles before formal persistence.

#### Scenario: Valid create bundle is received

- **WHEN** a create bundle contains operation, language, topic definition,
  resolver, resolved paper set, diagnostics, metadata, a complete section
  manifest, and base hashes
- **THEN** the validator SHALL accept the bundle.
- **AND** the bundle MAY include `markdown_path` as an optional run-workspace
  preview input.

#### Scenario: Valid update full bundle is received

- **WHEN** an update bundle uses `operation: "update_full"` and contains topic
  context, language, base hashes, and a complete section manifest
- **THEN** the validator SHALL accept the bundle.
- **AND** the bundle MAY include `markdown_path` as an optional run-workspace
  preview input.

#### Scenario: Valid update patch bundle is received

- **WHEN** an update bundle uses `operation: "update_patch"` and contains topic
  id, language, a `synthesis.topic_section_patch_manifest`, changed section
  names, changed section file paths, read section hashes, and replacement
  section hashes
- **THEN** the validator SHALL accept the bundle.
- **AND** the validator SHALL NOT require `markdown_path` for `update_patch`.

#### Scenario: Embedded Markdown is received

- **WHEN** a final bundle embeds a full `markdown` field
- **THEN** the validator SHALL reject it.

#### Scenario: Required section path is missing

- **WHEN** a completed create or full-update bundle omits a required section path
- **THEN** the validator SHALL reject it.

### Requirement: Create and update synthesis use separate skills

Topic synthesis create and update SHALL use separate ACP skills because their
inputs, context requirements, and output constraints differ.

#### Scenario: Create topic synthesis starts

- **WHEN** the user starts a new topic synthesis from a seed
- **THEN** the workflow SHALL invoke the create topic synthesis skill
- **AND** the skill SHALL accept topic seed and language
- **AND** it SHALL perform semantic duplicate checking before resolver
  generation.

#### Scenario: Update topic synthesis starts

- **WHEN** the user updates an existing topic synthesis
- **THEN** the workflow SHALL invoke the update topic synthesis skill
- **AND** the workflow parameters SHALL include topic id, update reason, update
  scope, update mode, and language
- **AND** the skill SHALL load host-provided topic context at job time through
  the Synthesis MCP context tool
- **AND** it MAY produce either full replacement or section patch output.

#### Scenario: Update context is loaded at job time

- **WHEN** the update topic synthesis skill starts
- **THEN** it SHALL call the Synthesis topic context tool for the selected topic
- **AND** the returned context SHALL include current artifact metadata, resolver,
  resolved paper set, freshness reasons, base hashes, and recommended update
  guidance.

### Requirement: Topic synthesis skills use a shared gated runtime

Create and update topic synthesis skills SHALL share a lightweight run-local
runtime with gate-controlled progression, SQLite process state, and
renderer-driven output materialization.

#### Scenario: Runtime starts

- **WHEN** either topic synthesis skill starts
- **THEN** it SHALL initialize a run-local SQLite runtime database
- **AND** it SHALL persist runtime inputs and workflow state before semantic
  processing begins.

#### Scenario: Runtime stage state is persisted

- **WHEN** a runtime stage starts, completes, fails, or is canceled
- **THEN** the runtime SHALL persist the stage state as `pending`, `running`,
  `completed`, `failed_retryable`, `failed_terminal`, or `canceled`
- **AND** resume SHALL recompute the active stage from SQLite state rather than
  prompt memory.

#### Scenario: Gate returns next action

- **WHEN** the runtime gate reports a `next_action`
- **THEN** the skill SHALL execute only that action
- **AND** every successful state-changing action SHALL write structured payloads
  through runtime scripts
- **AND** the skill SHALL re-run the gate before proceeding.

#### Scenario: External action is retried

- **WHEN** an external MCP/file/materialization action is retried after
  interruption
- **THEN** the runtime SHALL use deterministic `action_receipts` ids to make the
  action idempotent
- **AND** duplicate receipts SHALL NOT advance the workflow twice.

#### Scenario: Resolver is not validated

- **WHEN** no resolver has been validated through `synthesis.resolve_resolver`
- **THEN** the runtime SHALL block paper artifact reading and synthesis output
  generation.

#### Scenario: Paper workset is incomplete

- **WHEN** required paper artifact locators, availability state, and paper
  workset rows have not been persisted
- **THEN** the runtime SHALL block per-paper and cross-paper synthesis stages.

#### Scenario: Final outputs are rendered

- **WHEN** section outputs are ready
- **THEN** the runtime renderer SHALL materialize section JSON files, the section
  or patch manifest, and final stdout JSON from the SQLite state
- **AND** create/full-update runs MAY materialize a Markdown export
  compatibility file in the run workspace
- **AND** update-patch runs SHALL NOT depend on a Markdown export file
- **AND** it SHALL validate that the final bundle does not embed complete
  Markdown or contain direct-write instructions.

#### Scenario: Partial output is present

- **WHEN** a section, manifest, Markdown preview, or final stdout file exists in
  the run workspace but is not registered in `artifact_registry`
- **THEN** the runtime SHALL NOT treat that file as a valid final output
- **AND** the final bundle SHALL remain blocked until registered artifacts pass
  validation.

#### Scenario: Runtime resumes after retryable failure

- **WHEN** a stage is marked `failed_retryable`
- **THEN** resume SHALL return to that stage's gate-computed `next_action`
- **AND** it SHALL NOT skip to a later stage.

#### Scenario: Runtime encounters terminal failure

- **WHEN** the runtime DB schema version is unsupported or a stage is marked
  `failed_terminal`
- **THEN** the runtime SHALL NOT guess a migration, silently retry, or continue
  to final output.

#### Scenario: Runtime is canceled

- **WHEN** the user or host cancels the run
- **THEN** the runtime SHALL mark the workflow as `canceled`
- **AND** final stdout SHALL use the no-op `topic_synthesis_canceled` result.

### Requirement: Topic synthesis skill instructions are Chinese-first

The implementation SHALL rewrite the create and update topic synthesis skill
instructions in Chinese while preserving machine-facing identifiers in English.

#### Scenario: Skill instructions are authored

- **WHEN** `create-topic-synthesis` and `update-topic-synthesis` skill
  instructions are written
- **THEN** process guidance, stage rules, quality constraints, and warnings
  SHALL be written in Chinese
- **AND** schema keys, payload types, stable ids, command names, artifact paths,
  and final JSON fields SHALL remain English and machine-readable.

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, or note shards.

#### Scenario: Section artifacts are generated in the run workspace

- **WHEN** the skill writes section JSON files, a section or patch manifest,
  and optional Markdown preview/export files in the run workspace
- **THEN** those files SHALL be returned only as artifact paths or manifest paths
- **AND** formal persistence SHALL still be performed by the plugin applyResult
  hook.
