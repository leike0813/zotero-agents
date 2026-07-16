## ADDED Requirements

### Requirement: Transcript item and presentation row identities are distinct

Workspace page and mutation payloads SHALL use `itemId` as the only transcript item identity. A child presentation row that combines or transforms items SHALL use a separately named `rowKey` and SHALL declare the itemIds it represents; it SHALL NOT expose a derived row key as an itemId or translate itemId into a second item identity.

#### Scenario: Tool item is grouped for bubble presentation

- **WHEN** a shared tool-call item participates in a bubble tool group
- **THEN** receiver continuity and mutation lookup continue to use its original itemId
- **AND** the group uses a presentation-only rowKey with the represented itemIds.

### Requirement: Selected tail page remains bounded during delta application

The shared coordinator and receiver SHALL keep a stable tail page bounded by its declared limit. Its startCursor SHALL advance from totalItemCount, and newly visible tail items SHALL evict the same number of items from the page head. A historical page SHALL receive only metadata for off-page tail changes.

#### Scenario: Full tail page receives a new item

- **GIVEN** a selected tail page contains its limit of 80 items
- **WHEN** one new item is appended and totalItemCount advances by one
- **THEN** the selected page contains exactly 80 items
- **AND** startCursor advances by one without changing pageKey.

#### Scenario: Delete requires an unloaded replacement

- **WHEN** a deletion would require an item outside the loaded page to preserve a complete selected window
- **THEN** the receiver requests rebase
- **AND** it does not commit a guessed or incomplete page.

### Requirement: Transcript delta application is atomic and structurally incremental

The shared receiver SHALL validate a complete mutation batch before committing model or revision changes. The shared renderer SHALL implement upsert, append, patch and delete by reconciling only affected presentation rows. A steady delta SHALL NOT fall back to initialization or full-page rendering.

#### Scenario: Hard boundary releases text and adds a tool row

- **WHEN** a delta contains held text append, text finalization and a new tool upsert
- **THEN** the batch commits atomically
- **AND** only rows affected by those mutations are inserted or updated
- **AND** unrelated row nodes retain identity.

#### Scenario: Incremental render cannot establish a valid row projection

- **WHEN** the receiver or renderer cannot apply a steady delta consistently
- **THEN** model, revision and DOM remain unchanged
- **AND** the publication terminates as render-failed and requests rebase instead of performing a full render.
