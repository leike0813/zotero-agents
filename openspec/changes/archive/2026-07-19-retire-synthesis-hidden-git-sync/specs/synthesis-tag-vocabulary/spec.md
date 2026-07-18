## ADDED Requirements

### Requirement: Canonical tag writes schedule WebDAV autosync

Successful canonical TagVocab imports, staged promotions, and other durable tag mutations SHALL enter the shared WebDAV autosync maintenance epoch after their write transaction succeeds.

#### Scenario: Tag vocabulary mutation commits

- **WHEN** a canonical tag vocabulary mutation commits successfully
- **THEN** it SHALL schedule the same coalesced WebDAV autosync opportunity as
  other canonical service writes
- **AND** notification failure SHALL NOT roll back the tag mutation.
