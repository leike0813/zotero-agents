## MODIFIED Requirements

### Requirement: Related-items revocation is driven by promoted active graph state

Related-items sync SHALL revoke only relations with Synthesis-created provenance after the promoted active graph no longer contains the backing matched edge.

#### Scenario: Applied Synthesis-created relation becomes stale

- **GIVEN** a durable related-items sync effect is `applied`
- **AND** it records `createdBySynthesis=true`
- **WHEN** the promoted active graph no longer contains its backing citation edge
- **THEN** the related-items worker revokes the Zotero relation using the durable source and target Zotero keys.

#### Scenario: Relation has no Synthesis-created provenance

- **GIVEN** a Zotero relation existed before Synthesis sync or has `createdBySynthesis=false`
- **WHEN** the backing active graph edge disappears
- **THEN** Synthesis does not remove that external relation automatically.

### Requirement: Echo suppression uses pair-specific notifier metadata when available

Durable echo suppression SHALL match Zotero notifier echoes by source/target pair when the notifier provides a related target key, and SHALL fall back to item-level matching otherwise.

#### Scenario: Notifier provides a related target key

- **WHEN** a Zotero modify/refresh notifier event includes a related target item key
- **THEN** echo suppression consumes only the awaiting effect for that source/target pair
- **AND** unrelated awaiting effects on the same item remain awaiting.

#### Scenario: Notifier lacks related target key

- **WHEN** a Zotero modify/refresh notifier event lacks related target metadata
- **THEN** echo suppression may consume the first matching awaiting effect for that item within the durable echo window
- **AND** this accepted fallback risk is documented.
