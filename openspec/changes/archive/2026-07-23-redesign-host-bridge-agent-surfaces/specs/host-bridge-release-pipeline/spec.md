## ADDED Requirements

### Requirement: Surface publication SHALL resolve one composition manifest
Render, validation, materialization, and release-set generation SHALL resolve the same canonical surface graph, version patches, component identities, and mount paths.

#### Scenario: Impact propagates through inheritance
- **WHEN** a lower-layer component changes
- **THEN** every extending surface is rematerialized and records the new inherited component digest

### Requirement: Surface payload identity SHALL use staged bytes
Each surface payload digest SHALL be computed from a normalized manifest of the final staged files. Generated release-set metadata SHALL NOT be embedded into and recursively hashed as part of the same payload.

#### Scenario: Source digest cannot hide materialization drift
- **WHEN** staged payload bytes differ while source path lists are unchanged
- **THEN** the payload digest changes and stale publication is rejected

### Requirement: Surface versions SHALL remain release-line bound
Each surface version SHALL be the current CLI major/minor plus a surface-owned patch. Exact CLI identity, transitive component digests, payload digest, and release-set identity SHALL be published alongside the human version.

#### Scenario: CLI patch changes inherited payload identity
- **WHEN** only the CLI patch changes
- **THEN** downstream human surface versions remain stable while their exact CLI and payload identities change without overwriting prior bytes

### Requirement: Host Bridge publication SHALL validate governed Skill contracts
The content gate SHALL structurally validate every Skill declared by the three surfaces before materialization and SHALL require semantic-surface review for minimum completeness, semantic-baseline parity, package-local uniqueness, reference coherence, and layer independence.

#### Scenario: Invalid Skill blocks release preparation
- **WHEN** a governed Skill has a long/missing trigger description, missing mandatory section, orphan reference, duplicated substantive prose, or generated target used as source
- **THEN** Host Bridge content validation fails before release dispatch can be prepared

## REMOVED Requirements

### Requirement: Release pipeline SHALL publish composed semantic and generated Host Bridge guidance
**Reason**: The old composition model mixes mechanism, Generic policy, and hosted policy during independent rendering.
**Migration**: Publish the manifest-resolved Minimum, Generic, and Hermes composition chain.
