## ADDED Requirements

### Requirement: Chat publication count is display-projected

ACP Chat SHALL maintain raw persisted transcript count inside its domain store and SHALL expose `totalVisibleItemCount` to Workspace only through the selected display projection. Snapshot and delta metadata SHALL use the same projected count.

#### Scenario: Boundary text remains held

- **WHEN** a Chat assistant chunk is persisted but remains hidden until a hard boundary
- **THEN** raw storage may advance while `totalVisibleItemCount` does not
- **AND** a visible tool patch cannot leak the held text or raw count.
