## MODIFIED Requirements

### Requirement: Topic synthesis skill suite renders self-contained packages

The topic synthesis multi-skill suite SHALL keep its shared contracts,
payload schemas, templates, package-local runtime sources, and stage guidance
under `skills_src/topic-synthesis/`, and SHALL render the four published
packages under `skills_builtin/` from that source.

#### Scenario: Suite source is present

- **WHEN** the repository is inspected
- **THEN** `skills_src/topic-synthesis/contracts/` SHALL contain shared path,
  stage, stage guidance, handoff envelope, stdout envelope, DB schema, and
  payload schema assets
- **AND** `skills_src/topic-synthesis/templates/` SHALL contain reusable
  fragments plus one `SKILL.md` template for each published package.

#### Scenario: Renderer emits the four packages

- **WHEN** the topic synthesis suite renderer runs
- **THEN** it SHALL emit `create-topic-synthesis-prepare`,
  `update-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** each package SHALL contain a package-local `SKILL.md`,
  `scripts/gate.py`, `scripts/topic_synthesis_db.py`, and only the
  stage payload schemas needed by that package
- **AND** it SHALL NOT generate `references/stages/<stage-id>.md` files.

#### Scenario: Generated SKILL.md uses Chinese prose

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** its agent-facing headings and explanatory prose SHALL be written in
  Chinese
- **AND** stable identifiers such as stage ids, schema paths, JSON property
  names, and command paths MAY remain unchanged.

#### Scenario: Generated SKILL.md embeds actionable stage guidance

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** each local stage SHALL describe its execution steps, semantic
  intent, quality checks, and common pitfalls
- **AND** each payload stage SHALL include field guidance and one inline
  schema-valid JSON example.

#### Scenario: Old monolithic contracts are not copied into split instructions

- **WHEN** generated split-skill instructions are inspected
- **THEN** they SHALL NOT include old monolithic stage ids, action names,
  payload paths, or the old `analyses[]` paper-triage wrapper
- **AND** core enrichment instructions SHALL NOT require
  `runtime/views/external-literature-context.md`
- **AND** finalize instructions SHALL require
  `runtime/views/external-literature-context.md` for coverage and collection
  suggestion work.
