## ADDED Requirements

### Requirement: Topic synthesis skill suite renders self-contained packages

The topic synthesis multi-skill suite SHALL keep its shared contracts,
payload schemas, templates, and package-local runtime sources under
`skills_src/topic-synthesis/`, and SHALL render the four published packages
under `skills_builtin/` from that source.

#### Scenario: Suite source is present

- **WHEN** the repository is inspected
- **THEN** `skills_src/topic-synthesis/contracts/` SHALL contain shared path,
  stage, handoff envelope, stdout envelope, DB schema, and payload schema
  assets
- **AND** `skills_src/topic-synthesis/templates/` SHALL contain reusable
  fragments plus one `SKILL.md` template for each published package.

#### Scenario: Renderer emits the four packages

- **WHEN** the topic synthesis suite renderer runs
- **THEN** it SHALL emit `create-topic-synthesis-prepare`,
  `update-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** each package SHALL contain a package-local `SKILL.md`,
  `scripts/gate.py`, `scripts/topic_synthesis_db.py`, and only the
  stage payload schemas needed by that package.

#### Scenario: Generated SKILL.md uses Chinese prose

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** its agent-facing headings and explanatory prose SHALL be written in
  Chinese
- **AND** stable identifiers such as stage ids, schema paths, JSON property
  names, and command paths MAY remain unchanged.

#### Scenario: Output schema is local to each skill

- **WHEN** a generated prepare or core enrichment package is inspected
- **THEN** its `assets/output.schema.json` SHALL validate only that skill's
  handoff output shape
- **AND** it SHALL NOT describe the final topic synthesis result.

#### Scenario: Finalize output schema validates the final result

- **WHEN** `topic-synthesis-finalize/assets/output.schema.json` is inspected
- **THEN** it SHALL validate `topic_synthesis` and
  `topic_synthesis_canceled` outputs using the final result shape established
  by the existing create/update topic synthesis skills
- **AND** it SHALL NOT accept `topic_synthesis_handoff`.

#### Scenario: Generated packages are self-contained

- **WHEN** a generated package is executed from a current directory outside
  the package
- **THEN** `scripts/gate.py --db runtime/topic-synthesis.sqlite` SHALL return
  a stable JSON instruction for that package's first canonical stage
- **AND** package scripts SHALL NOT import or read
  `skills_src/topic-synthesis/` at runtime.

#### Scenario: Existing workflow packages remain unchanged

- **WHEN** the first-phase renderer contract is introduced
- **THEN** the existing `create-topic-synthesis` and `update-topic-synthesis`
  packages SHALL remain outside the renderer
- **AND** existing workflow entry points SHALL NOT switch to the new four
  package suite until a later change explicitly does so.
