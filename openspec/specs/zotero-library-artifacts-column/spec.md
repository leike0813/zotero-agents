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

The Zotero Library Artifacts column SHALL use the same top-level item and strict canonical artifact readiness classification as Host Bridge library readiness queries.

#### Scenario: Column checks top-level regular items
- **WHEN** the Artifacts column evaluates an item row
- **THEN** it SHALL use the shared readiness classifier for top-level regular item eligibility.

#### Scenario: Generated artifact marker is present
- **WHEN** a generated note exposes a recognized HTML payload marker or payload anchor
- **THEN** the shared readiness classifier SHALL still require readable valid canonical payload evidence.

#### Scenario: Generated artifact marker is missing but embedded payload exists
- **WHEN** a generated note has no recognized HTML marker and its preferred payload is readable
- **THEN** classification SHALL follow canonical owner and payload validation.

#### Scenario: Generated artifact heading has no payload evidence
- **WHEN** a note has a generated-artifact heading but no valid canonical payload evidence
- **THEN** the classifier SHALL NOT classify it as available.

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

### Requirement: Column scans SHALL recover without overwriting successful evidence

Artifacts and Rating SHALL share one parent scan and last successful state. Transient failures SHALL preserve successful values and retry at one, two and four seconds. Once this budget is exhausted, a real data invalidation SHALL be required. Old requests SHALL not overwrite or clear newer work.

#### Scenario: Initial scan temporarily fails
- **WHEN** readiness initially fails and a scheduled retry succeeds
- **THEN** both columns SHALL recover without a data mutation.

#### Scenario: A refreshed scan fails
- **WHEN** a parent has successful cached state and a subsequent scan fails
- **THEN** that state SHALL remain visible.

#### Scenario: A superseded scan settles
- **WHEN** a scan settles after invalidation, replacement or shutdown
- **THEN** it SHALL NOT replace current state or clear a newer pending scan.

### Requirement: Ordinary refresh SHALL invalidate column readiness

Ordinary item refresh SHALL invalidate the affected parents. Existing marked UI-only refresh notifications SHALL only repaint and SHALL NOT reset scans or retry budgets.

#### Scenario: A child or parent receives ordinary refresh
- **WHEN** an ordinary item refresh names a parent or one of its children
- **THEN** the parent's readiness SHALL be read again.

#### Scenario: Column scan requests repaint
- **WHEN** a marked UI-only refresh is published
- **THEN** the successful cache SHALL remain valid and no new scan SHALL be caused.
