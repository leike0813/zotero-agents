## MODIFIED Requirements

### Requirement: ACP Streaming Render Can Be Disabled

ACP Chat and ACP Skills SHALL use the global `live`, `boundary`, or `silent` Assistant execution display mode. `live` SHALL preserve natural text/thought streaming and coalesced metadata publication. `boundary` SHALL preserve the existing disabled-live behavior: canonical transcript remains complete, partial text stays hidden until semantic boundaries, and structural events remain visible.

In every mode, ACP Chat and ACP Skills SHALL count Assistant, Thought, and Tool semantic activity before display-mode projection. Consecutive chunks in one Assistant or Thought segment SHALL increment that category once; a new tool call SHALL increment Tool once; tool updates and soft side-channel updates SHALL neither increment nor split a segment. In `silent`, process content remains suppressed while all three counts continue to advance.

#### Scenario: live mode streams naturally

- **WHEN** mode is `live` and ACP emits many chunks plus metadata
- **THEN** text advances naturally
- **AND** semantic counts advance independently of metadata cadence.

#### Scenario: boundary mode retains complete canonical content

- **WHEN** mode is `boundary` and ACP emits text, thought, tool, and plan updates
- **THEN** canonical transcript retains the complete content
- **AND** visible text waits for its existing semantic boundary.

#### Scenario: silent mode counts hidden process activity

- **WHEN** mode is `silent` and ACP emits Assistant, Thought, and Tool semantic activity
- **THEN** no thought or tool row is displayed
- **AND** the corresponding semantic category counts advance once per segment or tool call.

#### Scenario: silent critical states remain immediate

- **WHEN** silent ACP Chat or ACP Skills receives permission, auth, waiting, error, cancel, interrupt, or terminal state
- **THEN** the panel publishes that state immediately.

