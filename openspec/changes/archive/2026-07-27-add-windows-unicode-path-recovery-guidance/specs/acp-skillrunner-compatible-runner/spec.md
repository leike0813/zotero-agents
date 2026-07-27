## ADDED Requirements

### Requirement: ACP Skills startup preamble SHALL guide Windows Unicode-path recovery

The packaged ACP Skills startup preamble SHALL instruct the agent that a Windows path which appears mojibake or fails lookup is not by itself a reason to abandon the run. The instruction SHALL require a Unicode-capable listing of a known parent directory, use of the exact returned filename together with available metadata, one retry, and no filename guessing or transliteration.

#### Scenario: ACP Skills starts with Windows recovery guidance
- **WHEN** ACP Skills builds its startup preamble
- **THEN** the rendered preamble SHALL contain the Windows Unicode-path recovery guidance
- **AND** it SHALL preserve the existing ACP Skills run-local contract and Host Bridge guidance.
