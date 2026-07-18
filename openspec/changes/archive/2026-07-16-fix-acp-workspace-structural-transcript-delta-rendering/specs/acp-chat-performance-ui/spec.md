## ADDED Requirements

### Requirement: Chat structural boundary rendering is mutation proportional

ACP Chat steady boundary rendering SHALL create, update, remove and measure work proportional to dirty presentation rows. It SHALL NOT scan, clone, canonicalize, reattach or measure a complete selected page because a new tool or message item was appended.

#### Scenario: Accepted boundary trace creates a tool row

- **WHEN** a tool call releases held assistant or thought text and appends one tool item
- **THEN** Chat uses the shared structural delta path
- **AND** steady full-render count and unaffected-row reattachment count remain zero.

### Requirement: Chat count publication avoids panel materialization

ACP Chat SHALL read message counts from the selected owner progress state and SHALL render them through the typed count region. Count publication and child rendering SHALL perform zero frontend, panel and transcript-page materialization.

#### Scenario: Tool count changes without another chrome change

- **WHEN** a tool call increments the selected execution count
- **THEN** the count publication carries only the typed counts DTO
- **AND** neither Host nor child constructs a complete panel read model.
