## ADDED Requirements

### Requirement: Transcript geometry work is dirty-row scoped

Steady transcript mutation SHALL measure only newly inserted or content-changing rows. Unchanged rows SHALL retain cached height and DOM position. A height change SHALL update scroll geometry or spacers without scheduling another full transcript render.

#### Scenario: One row changes in an 80-item page

- **WHEN** one visible item is patched without changing its neighbors
- **THEN** only its presentation row is eligible for rerender and measurement
- **AND** measurement work does not grow with the other 79 items.

### Requirement: Message-count publications render their typed region directly

Chat and Skills children SHALL render `message-counts` directly from the typed count payload. Count-only application SHALL NOT project or normalize a complete panel model and SHALL NOT invoke a full panel/runtime renderer.

#### Scenario: Tool count advances at a transcript boundary

- **WHEN** a selected owner receives a count-only publication
- **THEN** the shared message-counter renderer updates only the count nodes
- **AND** transcript, toolbar, banner, plan, hint, reply and drawer nodes retain identity.

### Requirement: Shared child delivery preserves identities while sharing a render frame

Chat and Skills SHALL use the same publication view/controller. Publications delivered before one render frame MAY share that frame, but the controller SHALL apply them in delivery order and SHALL emit a terminal render acknowledgement for every publication identity after its requested DOM work succeeds.

#### Scenario: Transcript and count publications describe one hard boundary

- **WHEN** transcript and message-count publications reach the child before the next render frame
- **THEN** both region effects complete in delivery order in that frame
- **AND** neither publication identity is skipped or merged into the other.
