## ADDED Requirements

### Requirement: Migration SHALL repair recoverable legacy parent sets without inventing identity

Migration SHALL read embedded legacy payloads through a private bounded recovery path of at most 4 MiB while ordinary Broker reads retain their normal limit. Canonical References SHALL participate in conversion and `no_references` classification. Legacy Citation facts nested under `reference` and `metadata` SHALL be normalized before the existing exact identity matcher. Migration SHALL compact Citation snippets when required to fit the managed-note boundary, preserve all item and mention identities and structure, and write only artifact kinds that require replacement. It SHALL NOT accept, ignore, or leave behind unreadable Citation damage as a successful conversion.

#### Scenario: Canonical References support oversized Citation repair
- **WHEN** a parent has valid canonical References and a recoverable legacy Citation payload between 1 MiB and 4 MiB
- **THEN** migration SHALL use the canonical References to resolve and compact the Citation
- **AND** it SHALL write Citation without replacing the canonical References
- **AND** verified reference count SHALL equal the canonical References count.

#### Scenario: Nested legacy citation facts match exactly
- **WHEN** a legacy Citation item stores bibliographic facts under `reference` and matching metadata under `metadata`
- **THEN** migration SHALL expose those facts to the existing exact matcher
- **AND** unresolved facts SHALL remain unresolved rather than being guessed.

#### Scenario: Oversized legacy payload is not recoverable
- **WHEN** a legacy Citation exceeds 4 MiB, is unreadable, or cannot fit after snippets reach zero characters
- **THEN** the candidate SHALL remain blocked without writing or cleanup
- **AND** migration SHALL NOT offer an accept-damaged-input bypass.

### Requirement: Migration batches SHALL continue only after proven candidate-local terminal failures

Each failed set SHALL preserve its typed authority receipt. A failed set MAY allow later sets to run only when its authority outcome is terminal, has zero residual effects, and has a candidate-local code explicitly classified as continuation-safe. A repair-required or ambiguous outcome SHALL stop further writes. A run that continued past one or more safe failures SHALL finish `completed_with_attention`.

#### Scenario: Candidate-local validation failure has no residual effects
- **WHEN** a set terminates with zero residual effects and code `resource_limited`, `invalid_artifact`, `legacy_artifact_requires_migration`, `conflict`, or `not_found`
- **THEN** the set SHALL remain failed with its receipt
- **AND** later approved sets SHALL continue
- **AND** the run SHALL finish `completed_with_attention`.

#### Scenario: Failure is unsafe to continue
- **WHEN** a set is repair-required, canceled, unavailable, infrastructure-failed, invalid-request, missing or unknown in authority, or has residual effects
- **THEN** migration SHALL stop scheduling new writes
- **AND** it SHALL preserve the terminal evidence for operator attention.
