## ADDED Requirements

### Requirement: Zotero library SHALL expose a lightweight Artifacts column

The plugin SHALL register a hidden-by-default Zotero library item tree custom
column named `Artifacts` that can be enabled from Zotero's column picker.

#### Scenario: Column registration

- **WHEN** the plugin starts successfully
- **THEN** it SHALL register an item tree column with data key `artifacts`
- **AND** the column SHALL be available in Zotero's main library tree picker
- **AND** the column SHALL NOT be visible by default.

#### Scenario: Column unregistration

- **WHEN** the plugin shuts down
- **THEN** it SHALL unregister the returned column data key.

### Requirement: Artifacts column SHALL render artifact presence icons

The library column SHALL display source Markdown, digest, references, and
citation-analysis artifact presence as compact icons for top-level regular
items.

#### Scenario: Source Markdown attachment exists

- **GIVEN** a top-level regular item has a best PDF attachment
- **AND** the same parent item has an attached `.md` or `.markdown` file with
  the same filename stem
- **WHEN** the Artifacts column renders that item
- **THEN** the column SHALL include the source Markdown icon.

#### Scenario: Generated note markers exist

- **GIVEN** a top-level regular item has direct child notes
- **AND** a child note's HTML is classified by `parseNoteKind()` as `digest`,
  `references`, or `citation-analysis`, or carries the matching generated
  payload-anchor marker
- **WHEN** the Artifacts column renders that item
- **THEN** the column SHALL include the matching digest, references, or
  citation-analysis icon.
- **AND** the column SHALL NOT decode note payloads, resolve note payload
  attachments, validate payload schemas, read Synthesis storage, or infer the
  artifact from the note title alone.

#### Scenario: Unsupported rows are ignored

- **WHEN** the item tree asks for column data for a note, attachment, child row,
  or item without a finite item id
- **THEN** the column SHALL return empty data and render no artifact icons.

### Requirement: Artifacts column SHALL stay cheap under dynamic item-tree refresh

The column SHALL use a synchronous data provider backed by cached asynchronous
scans and scoped cache invalidation.

#### Scenario: Uncached item is requested

- **WHEN** the item tree requests column data for an uncached top-level regular
  item
- **THEN** the data provider SHALL start one asynchronous scan for that item and
  immediately return empty data.
- **AND** scan completion SHALL debounce a column refresh.

#### Scenario: Item notification invalidates cache

- **WHEN** Zotero reports item changes for a parent item or one of its child
  attachments or notes
- **THEN** the plugin SHALL clear the affected parent cache entry
- **AND** it SHALL schedule a column refresh.
