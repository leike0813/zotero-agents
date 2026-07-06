## MODIFIED Requirements

### Requirement: Artifacts column uses shared artifact readiness classification

The Zotero Library Artifacts column SHALL use the same top-level item and artifact readiness classification as Host Bridge library readiness queries.

#### Scenario: Column checks top-level regular items

- **WHEN** the Artifacts column evaluates an item row
- **THEN** it SHALL use the shared readiness classifier for top-level regular item eligibility.

#### Scenario: Generated artifact marker is present

- **WHEN** a generated note exposes a recognized HTML payload marker or payload anchor
- **THEN** the shared readiness classifier SHALL classify the generated artifact without reading embedded payload contents.

#### Scenario: Generated artifact marker is missing but embedded payload exists

- **WHEN** a schema-versioned generated note has a generated-artifact heading and no recognized HTML marker
- **AND** a preferred embedded payload block for that generated artifact type is readable from the note's child attachments
- **THEN** the shared readiness classifier SHALL classify that generated artifact as present.

#### Scenario: Generated artifact heading has no payload evidence

- **WHEN** a schema-versioned generated note has a generated-artifact heading but no recognized HTML marker and no readable embedded payload block for that artifact type
- **THEN** the shared readiness classifier SHALL NOT classify that generated artifact as present.

### Requirement: Artifacts column SHALL stay cheap under dynamic item-tree refresh

The column SHALL use a synchronous data provider backed by cached asynchronous scans and scoped cache invalidation.

#### Scenario: Uncached item is requested

- **WHEN** the item tree requests column data for an uncached top-level regular item
- **THEN** the data provider SHALL start one asynchronous scan for that item and immediately return empty data.
- **AND** scan completion SHALL debounce a row refresh.

#### Scenario: Item notification invalidates cache

- **WHEN** Zotero reports item changes for a parent item or one of its child attachments or notes
- **THEN** the plugin SHALL clear the affected parent cache entry
- **AND** it SHALL schedule a row refresh for affected parent items.

#### Scenario: Row refresh does not reset item tree columns

- **WHEN** an artifact scan or item notification changes Artifacts column state
- **THEN** the plugin SHALL refresh affected item rows without refreshing item tree columns.
