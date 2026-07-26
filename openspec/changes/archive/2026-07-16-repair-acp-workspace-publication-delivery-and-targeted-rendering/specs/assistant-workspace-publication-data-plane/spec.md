## ADDED Requirements

### Requirement: Transcript mutations have minimal canonical semantics

ACP Chat and ACP Skills SHALL use one before/after projection for visible transcript items. Pure suffix growth SHALL emit `append_text`, stable-item field changes SHALL emit a minimal `patch_item`, new or identity-replacing items SHALL emit `upsert_item`, and removed items SHALL emit `delete_item`. Steady projection SHALL NOT replace a patch with a complete item or inspect a complete page.

#### Scenario: Stable item metadata changes

- **WHEN** either surface changes one visible field on an existing item without changing its identity
- **THEN** it publishes one `patch_item` containing only the changed normalized field
- **AND** Chat and Skills use the same field null and omission semantics.

#### Scenario: Long text receives a suffix

- **WHEN** an existing text segment receives another chunk
- **THEN** the publication contains only the new suffix
- **AND** projection cost is independent of accumulated text and page size.

### Requirement: Transcript owner delivery is totally ordered

The coordinator SHALL place loading, ready page, delta, resync-required, page transition, and rebase publications for one owner in one ordered lane. A later publication SHALL NOT overtake an earlier publication across page keys, and only accepted render completion or a terminal rejection SHALL advance the lane.

#### Scenario: Indexed page becomes ready during owner initialization

- **WHEN** the page read finishes before the loading snapshot receives terminal acknowledgement
- **THEN** the ready snapshot remains queued behind loading
- **AND** no delta can validate against an uncommitted owner.

### Requirement: Typed delivery survives child document readiness

Shell SHALL retain typed publications by tab and delivery sequence until a terminal child acknowledgement. Child readiness SHALL identify a document generation; Shell SHALL replay retained publications to a newly ready generation, and the shared receiver SHALL return an idempotent terminal result for duplicate publication identity.

#### Scenario: Child listener starts late

- **WHEN** Shell receives a transcript page publication before the child document declares ready
- **THEN** Shell retains and forwards it after readiness
- **AND** the transcript becomes visible without another runtime change or user tab switch.

#### Scenario: Child document is replaced

- **WHEN** an iframe receives a new document generation
- **THEN** Host publishes the current activation/page snapshot for that generation
- **AND** the replacement document does not depend on revision state from the old document.

### Requirement: Render acknowledgement represents completed DOM work

Child apply SHALL commit the validated model before acknowledgement, and accepted render completion SHALL be emitted only after the requested transcript DOM effect succeeds. Renderer failure SHALL produce terminal `render-failed` and SHALL NOT be reported as accepted.

#### Scenario: Target row rendering throws

- **WHEN** the shared renderer cannot apply a transcript effect
- **THEN** the publication receives terminal `render-failed`
- **AND** the coordinator does not treat it as accepted render completion.
