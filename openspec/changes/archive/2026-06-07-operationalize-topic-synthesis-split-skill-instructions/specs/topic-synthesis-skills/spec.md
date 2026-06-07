## MODIFIED Requirements

### Requirement: Topic synthesis skill suite renders self-contained packages

The topic synthesis multi-skill suite SHALL render self-contained generated
packages whose single `SKILL.md` instructions are operationally executable
from the current split gate/runtime contract.

#### Scenario: Generated package keeps one instruction surface

- **WHEN** the renderer emits a split topic synthesis package
- **THEN** the package SHALL contain a single agent-facing `SKILL.md`
- **AND** it SHALL NOT generate `references/stages/<stage-id>.md`.

#### Scenario: Generated SKILL.md includes global operational guidance

- **WHEN** a generated package `SKILL.md` is inspected
- **THEN** it SHALL include product goals and quality standards
- **AND** it SHALL include `zotero-bridge` CLI usage guidance
- **AND** it SHALL include the LLM/runtime responsibility boundary
- **AND** it SHALL include the strict gate execution order.
- **AND** concrete quality goals and LLM/runtime responsibilities SHALL be
  scoped to that generated skill's local stages.

#### Scenario: Each stage has a concrete command sequence

- **WHEN** a local stage section is inspected
- **THEN** it SHALL tell the agent to run gate first
- **AND** command examples SHALL use portable bare `python scripts/gate.py`
  commands
- **AND** command examples SHALL NOT include local developer wrappers such as
  `uv run --project="$HOME/.ar" --locked`
- **AND** command stages SHALL tell the agent to execute the returned
  `command` field and rerun gate
- **AND** payload stages SHALL tell the agent to inspect `required_reads`,
  `payload_path`, `payload_schema`, and `submit_command`, write exactly that
  payload file, execute the returned submit command, and rerun gate.

#### Scenario: Host reads are executable

- **WHEN** create prepare instructions are inspected
- **THEN** topic list context SHALL be described using
  `zotero-bridge synthesis list-topics --input '{}'`
- **AND** library index context SHALL be described using
  `zotero-bridge synthesis get-library-index --input '{"cursor":0,"limit":200}'`
- **AND** opaque labels such as `Host 主题列表` and `Host 文库索引` SHALL NOT
  appear as standalone required-read instructions.

#### Scenario: Split boundaries remain authoritative

- **WHEN** generated split-skill instructions are inspected
- **THEN** they SHALL NOT include old monolithic stage ids, action names,
  payload paths, or the old `analyses[]` paper-triage wrapper
- **AND** core enrichment instructions SHALL NOT require
  `runtime/views/external-literature-context.md`
- **AND** finalize instructions SHALL require
  `runtime/views/external-literature-context.md`.
