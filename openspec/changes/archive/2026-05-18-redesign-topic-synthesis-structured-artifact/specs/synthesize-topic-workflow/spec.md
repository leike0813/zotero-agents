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

### Requirement: Topic synthesis workflows use split create/update entrypoints

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

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Agents do not directly write formal assets

The workflow result bundle SHALL NOT contain direct write instructions for raw
Zotero source, canonical indexes, or note shards.

#### Scenario: Section artifacts are generated in the run workspace

- **WHEN** the skill writes section JSON files, a section or patch manifest,
  and optional Markdown preview/export files in the run workspace
- **THEN** those files SHALL be returned only as artifact paths or manifest paths
- **AND** formal persistence SHALL still be performed by the plugin applyResult
  hook.
