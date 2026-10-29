## ADDED Requirements

### Requirement: Managed replacement SHALL retain omitted auxiliary payloads

Trusted managed parent-set replacement SHALL retain valid auxiliary payloads that the request does not explicitly replace, including their readable anchors. Explicit replacement of an auxiliary type SHALL take precedence. Migration remains governed by its declared conversion plan.

#### Scenario: Digest update omits matching metadata
- **WHEN** a digest with matching metadata is updated without new matching metadata
- **THEN** the updated note SHALL retain the existing metadata value and a valid anchor
- **AND** subsequent bundle export SHALL include that metadata.

#### Scenario: Digest update supplies replacement metadata
- **WHEN** a digest update supplies a new value for an existing auxiliary payload type
- **THEN** exactly the new value SHALL be retained for that type.

### Requirement: Private transfer SHALL preserve intact auxiliary data with missing anchors

Private bundle transfer SHALL accept a uniquely identified, decodable auxiliary payload whose sole storage defect is an absent HTML anchor. Transfer SHALL retain the complete logical value without modifying the source note. Public payload reads SHALL continue to report the source anchor defect. Missing or invalid data, duplicate identities, mismatched anchors, and required managed payload defects SHALL remain errors.

#### Scenario: An intact auxiliary attachment has lost its anchor
- **WHEN** a managed note has one valid auxiliary attachment for a payload type and no HTML anchor for that type
- **THEN** export SHALL preserve its complete value in the bundle
- **AND** import SHALL restore its readable payload anchor
- **AND** export SHALL leave the source note unchanged.

#### Scenario: The auxiliary attachment is ambiguous or damaged
- **WHEN** an auxiliary payload has multiple candidates, malformed content, or an anchor pointing to another attachment
- **THEN** transfer SHALL fail without silently dropping or choosing a value.
