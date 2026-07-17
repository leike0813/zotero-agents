## ADDED Requirements

### Requirement: Workflow product asset targets have one canonical identity

Workflow product storage SHALL derive one validated managed relative path for each asset materialization outcome and SHALL use that path for duplicate detection, managed-file placement, persisted relative metadata, and missing-asset diagnostics.

#### Scenario: Explicit product target is registered

- **WHEN** a workflow supplies `productAssetPath`
- **THEN** storage SHALL validate that exact value with the managed-relative-path policy before writing any asset
- **AND** SHALL reject absolute, traversing, or otherwise invalid managed paths instead of silently rewriting them.

#### Scenario: Legacy result artifact input is registered

- **WHEN** a workflow omits `productAssetPath` and supplies existing `rawPath` or `fallbackPath` input
- **THEN** storage SHALL preserve compatibility normalization before validating the inferred managed relative path
- **AND** SHALL use the normalized result as the asset's only target identity.

#### Scenario: Final targets collide

- **WHEN** two assets resolve to the same normalized final target
- **THEN** registration SHALL fail with the existing duplicate-target behavior before the second target is materialized.

#### Scenario: Non-atomic asset resolution fails

- **WHEN** a non-atomic registration cannot resolve one asset
- **THEN** its missing-asset record SHALL use a validated target derived from declared fields and asset identity
- **AND** storage SHALL not calculate a different target later in the registration flow.

### Requirement: Product storage single-asset methods share one implementation

The product storage API SHALL retain `cacheBundleAsset` and `registerLocalAsset` while routing both methods through the same internal source-resolution and managed-target materialization behavior.

#### Scenario: Existing hook uses a single-asset method

- **WHEN** an external workflow hook calls either existing single-asset method
- **THEN** the method SHALL retain its public signature and managed-copy behavior
- **AND** SHALL apply the same target policy as product registration.
