## MODIFIED Requirements

### Requirement: Literature registry canonical records preserve anchor-derived identity

Literature Registry SHALL resolve accepted redirects, unique strong identifiers,
current Zotero bindings, and compatible provisional/fallback identities before
allocating any new `literature_item_id`.

#### Scenario: Strong identity appears for a binding fallback

- **WHEN** a previously binding-fallback literature item gains a unique strong
  work identity
- **THEN** the Registry SHALL retarget through a redirect or equivalent durable
  decision
- **AND** it SHALL NOT silently mutate the old row identity in place.

### Requirement: Citation graph projection is basis guarded

Citation Graph SHALL keep structure, metrics, layout, and Registry-dependent
read models basis guarded: each derived output records the Registry basis it was
built from and becomes visible only through a final transaction-local basis
check.

#### Scenario: Registry basis changes during graph work

- **WHEN** graph work finishes after the active Registry basis changed
- **THEN** final promotion SHALL mark the run/event superseded
- **AND** stale rows SHALL remain invisible.

### Requirement: Related-items sync is a graph-owned side effect

Zotero related-items sync SHALL be derived from accepted library-to-library
citation edges and SHALL be idempotent, bounded, and provenance protected.

#### Scenario: Backing citation edge disappears

- **WHEN** a synced edge is rejected, retargeted, superseded, or loses an active
  Zotero binding
- **THEN** Synthesis MAY revoke only relations recorded as Synthesis-created
- **AND** it SHALL leave pre-existing or user-created relations untouched.
