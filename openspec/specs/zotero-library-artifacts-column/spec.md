# zotero-library-artifacts-column Specification

## Purpose
TBD - created by syncing change add-library-artifacts-column. Update Purpose after archive.

## Requirements

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

The column SHALL use a synchronous data provider backed by cached asynchronous
scans and scoped cache invalidation.

#### Scenario: Uncached item is requested

- **WHEN** the item tree requests column data for an uncached top-level regular
  item
- **THEN** the data provider SHALL start one asynchronous scan for that item and
  immediately return empty data.
- **AND** scan completion SHALL debounce a row refresh.

#### Scenario: Item notification invalidates cache

- **WHEN** Zotero reports item changes for a parent item or one of its child
  attachments or notes
- **THEN** the plugin SHALL clear the affected parent cache entry
- **AND** it SHALL schedule a row refresh for affected parent items.

#### Scenario: Row refresh does not reset item tree columns

- **WHEN** an artifact scan or item notification changes Artifacts column state
- **THEN** the plugin SHALL refresh affected item rows without refreshing item tree columns.

### Requirement: Zotero library SHALL expose a Rating column

The plugin SHALL register a hidden-by-default `literatureRating` custom column
after the Artifacts column and preserve user-persisted column order.

#### Scenario: Valid score is rendered

- **WHEN** a top-level item has a valid `literature_score.v1` payload
- **THEN** Rating SHALL map `overall_score` to the nearest half star
- **AND** 60 SHALL render three filled and two hollow stars
- **AND** 65 SHALL render three filled, one half-filled, and one hollow star.

#### Scenario: Score is missing or invalid

- **WHEN** no valid score payload can be resolved
- **THEN** Rating SHALL render five gray stars
- **AND** its accessible label SHALL identify the score as unavailable.

#### Scenario: Item-tree data is requested repeatedly

- **WHEN** Artifacts and Rating are requested for the same parent item
- **THEN** both columns SHALL share one asynchronous scan and cache entry
- **AND** note or child attachment changes SHALL invalidate and refresh only the
  affected parent rows.

### Requirement: Rating SHALL remain separate from artifact completeness

The Rating column SHALL NOT alter the artifact kinds or completeness state
rendered by the Artifacts column.

#### Scenario: Score exists or is absent

- **WHEN** the Artifacts column computes digest, references, and
  citation-analysis readiness
- **THEN** score state SHALL NOT add an artifact icon or change the existing
  three-artifact semantics.
