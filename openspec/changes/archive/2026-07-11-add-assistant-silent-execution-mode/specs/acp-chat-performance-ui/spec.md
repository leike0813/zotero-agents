## MODIFIED Requirements

### Requirement: ACP Streaming Render Can Be Disabled

ACP Chat and ACP Skills SHALL use the global `live`, `boundary`, or `silent` Assistant execution display mode. `live` SHALL preserve natural text/thought streaming and coalesced metadata publication. `boundary` SHALL preserve the existing disabled-live behavior: canonical transcript remains complete, partial text stays hidden until semantic boundaries, and structural events remain visible.

In `silent`, ACP Chat and ACP Skills SHALL count semantic assistant messages but SHALL NOT publish assistant chunks, thoughts, tools, plans, workspace activity, ordinary statuses, or invalid/pending output projections. User content, critical interaction state, final assistant results, and terminal outcomes SHALL remain immediate. Consecutive assistant chunks in one segment SHALL increment the count once; soft side-channel updates SHALL not split the segment.

#### Scenario: live mode streams naturally

- **WHEN** mode is `live` and ACP emits many chunks plus metadata
- **THEN** text advances naturally
- **AND** metadata remains governed by shared cadence.

#### Scenario: boundary mode retains complete canonical content

- **WHEN** mode is `boundary` and ACP emits text, thought, tool, and plan updates
- **THEN** canonical transcript retains the complete content
- **AND** visible text waits for its existing semantic boundary.

#### Scenario: silent mode counts semantic messages

- **WHEN** mode is `silent` and consecutive assistant chunks are followed by a tool boundary and another assistant chunk
- **THEN** the visible agent-message count advances from one to two
- **AND** no thought or tool row is displayed.

#### Scenario: silent critical states remain immediate

- **WHEN** silent ACP Chat or ACP Skills receives permission, auth, waiting, error, cancel, interrupt, or terminal state
- **THEN** the panel publishes that state immediately.

