## ADDED Requirements

### Requirement: Bundle import SHALL resolve an explicit non-interactive destination

The import workflow SHALL accept optional `targetLibraryId` (positive integer)
and `targetCollection` (`libraryId:collectionKey`) parameters. An explicit
collection SHALL identify its destination library. When both are supplied,
their library IDs SHALL agree. Interactive import without explicit parameters
SHALL retain the current-view destination behavior.

#### Scenario: Import into an explicit library root

- **WHEN** a bound bundle and `targetLibraryId` are supplied without a collection
- **THEN** import creates new parents in that library root without reading the current view

#### Scenario: Import into an explicit collection

- **WHEN** a bound bundle and `targetCollection` are supplied
- **THEN** import creates new parents in that collection's library and adds them to that collection

#### Scenario: Invalid or absent non-interactive destination

- **WHEN** a non-interactive import lacks a destination, has an invalid ID/ref, or specifies different library IDs
- **THEN** it fails before creating parents and does not use the ambient UI as a fallback
