# acp-skills-interactive-execution Delta

## MODIFIED Requirements

### Requirement: ACP Skill Interactive Pending Turns Do Not Trigger Apply

Interactive ACP Skill runs SHALL treat `__SKILL_DONE__: false` turn payloads as waiting-user state, not as workflow completion.

The pending envelope `message` SHALL be projected into the canonical assistant transcript message. The pending envelope `ui_hints` SHALL only drive hint widget controls and SHALL NOT be repeated as banner or notice text.

#### Scenario: Pending turn projects message and hints separately

- **GIVEN** an interactive ACP Skill run returns a schema-valid payload with `__SKILL_DONE__: false`, `message`, and `ui_hints`
- **WHEN** the runner converges the assistant turn
- **THEN** the run status is `waiting_user`
- **AND** the pending `message` appears as the assistant transcript message
- **AND** `ui_hints` controls the hint widget prompt, hint, and quick reply options
- **AND** workflow apply is not triggered.

### Requirement: ACP Skill Result Envelope Is Runner-Generated

ACP Skills SHALL write `result/result.json` only after final turn convergence; agents SHALL NOT be instructed to write that file as the completion signal.

When a final envelope is projected to the transcript, the `__SKILL_DONE__` marker SHALL be removed from the visible canonical message.

#### Scenario: Final turn projects canonical message

- **GIVEN** an assistant turn returns a schema-valid payload with `__SKILL_DONE__: true`
- **WHEN** the runner validates the final output fields
- **THEN** the runner writes the final payload to `result/result.json`
- **AND** the transcript displays the canonical final message without the `__SKILL_DONE__` marker.

## ADDED Requirements

### Requirement: ACP Skill Output Revision Trail

ACP Skills SHALL record invalid candidates, repair attempts, replacement reasons, and repaired outcomes as an output revision trail.

The main transcript SHALL show only canonical assistant messages. Invalid or replaced candidates SHALL be available through details/diagnostics and SHALL NOT render as ordinary assistant messages.

#### Scenario: Invalid candidate is diagnostic-only

- **GIVEN** an ACP Skill run receives an invalid output candidate
- **WHEN** output validation triggers repair
- **THEN** the invalid candidate is recorded in output revisions
- **AND** the main transcript does not show the raw invalid candidate as a normal assistant message.

#### Scenario: Repaired candidate shows revision badge

- **GIVEN** a turn has one or more invalid candidates before a valid pending or final output
- **WHEN** the canonical assistant message renders
- **THEN** the message may show a compact revision badge
- **AND** the full candidate trail is available in details/diagnostics.
