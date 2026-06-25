## ADDED Requirements

### Requirement: Runtime SHALL materialize stage agent packets

The `literature-deep-reading` runtime SHALL materialize compact agent-facing
packet views at each stage handoff so agents can read one default packet instead
of many runtime-owned intermediate views.

#### Scenario: Bootstrap creates the Stage 10 packet

- **WHEN** `scripts/deep_reading_runtime.py bootstrap --input runtime/input.json`
  succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-10-agent-packet.json`
- **AND** the packet SHALL include the next payload path, submit command,
  validate command, summary, work items, diagnostics summary, and trace paths
- **AND** the packet SHALL NOT inline full source markdown or full reading
  blocks.

#### Scenario: Stage 10 creates the Stage 20 packet

- **WHEN** `submit-context-request` succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-20-agent-packet.json`
- **AND** the packet SHALL summarize Host context availability, topic context,
  concept needs, reference digest availability, diagnostics, and trace paths.

#### Scenario: Stage 20 creates the Stage 30 worklist

- **WHEN** `submit-reading-enrichment` succeeds
- **THEN** the runtime SHALL write
  `runtime/views/stage-30-translation-worklist.json`
- **AND** the worklist SHALL summarize translation source, target language,
  required translation count, required block ids, batch paths, batch counts, and
  diagnostics.
- **AND** if translator alignment already supplies translations, the worklist
  SHALL identify that block translation submission should be skipped.

#### Scenario: Stage 30 creates the Stage 40 review packet

- **WHEN** `submit-block-translations` succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-40-review-packet.json`
- **AND** the packet SHALL summarize translation counts, translation source,
  diagnostics, and trace paths for final review.

### Requirement: Stage validation SHALL require packet handoffs

The `literature-deep-reading` validation commands SHALL verify that the expected
agent-facing packet exists and contains valid JSON before declaring a stage
valid.

#### Scenario: Packet is missing after bootstrap

- **GIVEN** bootstrap views exist
- **AND** `runtime/views/stage-10-agent-packet.json` is missing
- **WHEN** `validate-bootstrap` runs
- **THEN** validation SHALL fail.

#### Scenario: Packet is missing after a submit stage

- **GIVEN** a submit command has generated its normal runtime views
- **AND** the corresponding agent-facing packet is missing
- **WHEN** the matching `validate-*` command runs
- **THEN** validation SHALL fail.

### Requirement: Skill instructions SHALL enforce submit validate gates

The generated `literature-deep-reading` skill instructions SHALL require agents
to validate each stage immediately after submit and to repair the current stage
payload before continuing.

#### Scenario: Generated instructions describe the gate

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` and `assets/runner.json` SHALL instruct the agent to run
  the matching `validate-*` command after each submit command
- **AND** they SHALL instruct the agent not to continue to the next stage until
  validation returns `ok: true`.

#### Scenario: Generated instructions are packet-first

- **WHEN** the built-in skill package is rendered
- **THEN** Stage 30 instructions SHALL default to reading
  `runtime/views/stage-30-translation-worklist.json` and the listed batch files
- **AND** Stage 40 instructions SHALL default to reading
  `runtime/views/stage-40-review-packet.json`
- **AND** larger runtime views SHALL be described as trace paths for use only
  when needed.
