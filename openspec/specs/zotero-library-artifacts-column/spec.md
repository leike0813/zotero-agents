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
