## ADDED Requirements

### Requirement: ACP Chat startup preamble SHALL guide Windows Unicode-path recovery

The packaged ACP Chat startup preamble SHALL instruct the agent that a Windows path which appears mojibake or fails lookup is not by itself a reason to abandon the task. The instruction SHALL require a Unicode-capable listing of a known parent directory, use of the exact returned filename together with available metadata, one retry, and no filename guessing or transliteration.

#### Scenario: ACP Chat starts with Windows recovery guidance
- **WHEN** ACP Chat builds its startup preamble
- **THEN** the rendered preamble SHALL contain the Windows Unicode-path recovery guidance
- **AND** it SHALL preserve the existing ACP Chat startup placeholders and Host Bridge guidance.

