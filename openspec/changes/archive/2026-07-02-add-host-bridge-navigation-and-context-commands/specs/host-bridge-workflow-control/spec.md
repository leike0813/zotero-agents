## ADDED Requirements

### Requirement: Host Bridge exposes context and navigation endpoints

Host Bridge SHALL expose authenticated REST endpoints for reading Zotero context
and navigating to Zotero objects.

#### Scenario: Client reads current context

- **WHEN** an authenticated client requests `GET /bridge/v1/context/current`
- **THEN** the bridge SHALL return the current Zotero context summary
- **AND** the response SHALL be equivalent to the existing current-view host
  context capability.

#### Scenario: Client reads current selection

- **WHEN** an authenticated client requests `GET /bridge/v1/context/selection`
- **THEN** the bridge SHALL return lightweight summaries for currently selected
  Zotero items.

#### Scenario: Client opens Zotero objects

- **WHEN** a client posts a Zotero item, note, collection, or selected item
  handle to a context navigation endpoint
- **THEN** the bridge SHALL navigate the Zotero UI to the requested object when
  it exists
- **AND** the response SHALL include `opened`, `found`, `target`, and
  `currentView`.

#### Scenario: Client supplies an invalid navigation target

- **WHEN** a navigation request contains a local path, URI, arbitrary script, or
  an unknown object handle
- **THEN** the bridge SHALL reject the request with a stable error code
- **AND** it SHALL NOT fall back to arbitrary opening or evaluation.
