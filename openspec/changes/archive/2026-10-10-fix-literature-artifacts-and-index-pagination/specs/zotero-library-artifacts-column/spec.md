## MODIFIED Requirements

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

## ADDED Requirements

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
