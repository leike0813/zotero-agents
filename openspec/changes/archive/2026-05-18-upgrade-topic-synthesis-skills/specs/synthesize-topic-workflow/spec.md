# synthesize-topic-workflow Delta

## MODIFIED Requirements

### Requirement: Topic synthesis workflows use split create/update entrypoints

Topic synthesis create and update SHALL use separate ACP skills because their
inputs, context requirements, and output constraints differ.

#### Scenario: Create topic synthesis skill package is self-contained

- **WHEN** the create topic synthesis skill is installed from
  `skills_builtin/create-topic-synthesis`
- **THEN** the package SHALL contain package-local runtime scripts, schemas,
  templates, and references required for create-mode execution.
- **AND** its `SKILL.md` and runner prompt SHALL NOT reference a shared runtime
  directory as the default internal resource.

#### Scenario: Update topic synthesis skill package is self-contained

- **WHEN** the update topic synthesis skill is installed from
  `skills_builtin/update-topic-synthesis`
- **THEN** the package SHALL contain package-local runtime scripts, schemas,
  templates, and references required for update-mode execution.
- **AND** its `SKILL.md` and runner prompt SHALL NOT reference a shared runtime
  directory as the default internal resource.

#### Scenario: Create topic synthesis starts

- **WHEN** the user starts a new topic synthesis from a seed
- **THEN** the workflow SHALL invoke the create topic synthesis skill
- **AND** the skill SHALL accept topic seed and language
- **AND** the `SKILL.md` body SHALL document the minimum executable path without
  requiring references to discover mandatory steps
- **AND** it SHALL perform semantic duplicate checking with
  `synthesis.list_topics` before resolver generation
- **AND** before resolver generation it SHALL read the complete lightweight
  library index through paged `synthesis.get_library_index` calls, not a single
  bounded first page
- **AND** it SHALL document resolver creation, resolved paper workset creation,
  per-paper analysis, section authoring, and final stdout constraints.

#### Scenario: Update topic synthesis starts

- **WHEN** the user updates an existing topic synthesis
- **THEN** the workflow SHALL invoke the update topic synthesis skill
- **AND** the workflow parameters SHALL include topic id, update reason, update
  scope, update mode, and language
- **AND** the `SKILL.md` body SHALL document the minimum executable path without
  requiring references to discover mandatory steps
- **AND** the skill SHALL load host-provided topic context at job time through
  `synthesis.get_topic_context`
- **AND** it SHALL choose `update_full` or `update_patch` from
  `recommended_update` and documented invalidation rules.

#### Scenario: Required MCP service is unavailable

- **WHEN** a required Zotero Synthesis MCP service or tool is unavailable
- **THEN** the skill SHALL NOT fabricate topic synthesis content.
- **AND** it SHALL emit a schema-valid `topic_synthesis_canceled` result.
- **AND** the result reason SHALL be `mcp_unavailable` or
  `required_mcp_tool_unavailable`.

#### Scenario: Package-local scripts are documented

- **WHEN** an agent reads only `SKILL.md`
- **THEN** it SHALL find the purpose and command examples for
  `scripts/gate_runtime.py` and `scripts/stage_runtime.py`.
- **AND** it SHALL find that `scripts/runtime_db.py` is import-only and has no
  standalone CLI.

#### Scenario: Runtime hard contract is documented in SKILL.md

- **WHEN** an agent reads only `SKILL.md`
- **THEN** it SHALL find that SQLite is the run-local single source of truth.
- **AND** it SHALL find the fixed stage list and allowed stage states.
- **AND** it SHALL find failure handling for `failed_retryable`,
  `failed_terminal`, and `canceled`.
- **AND** it SHALL find that unregistered partial outputs are not valid final
  outputs.
- **AND** it SHALL find that final outputs must pass through `artifact_registry`.

#### Scenario: References are optional expansions

- **WHEN** package-local references are read
- **THEN** they SHALL be Chinese optional expansion material.
- **AND** they SHALL include concrete examples.
- **AND** hard execution constraints SHALL already be present in `SKILL.md`.
- **AND** runtime hard contracts SHALL NOT be kept in a
  `references/runtime_contract.md` document.
