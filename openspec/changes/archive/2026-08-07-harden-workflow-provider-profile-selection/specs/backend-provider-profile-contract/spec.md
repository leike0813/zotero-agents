# backend-provider-profile-contract

## ADDED Requirements

### Requirement: Provider profile resolution is ordered and explicit

The CLI SHALL prefer an explicit profile over
`ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`. A Host workflow default SHALL be
disclosed only as a candidate and SHALL NOT be merged into submit input.

#### Scenario: Explicit empty profile overrides the environment

- **WHEN** submit receives `--provider-profile {}` and the environment default
  is set
- **THEN** the request SHALL contain the explicit empty profile
- **AND** the environment profile SHALL NOT be used.

#### Scenario: Backend-required workflow has no profile

- **WHEN** submit omits the profile and no environment default exists
- **THEN** Host SHALL return `provider_profile_required`
- **AND** it SHALL not start a workflow task.

### Requirement: ACP catalog readiness is fail-closed

Catalog-sensitive ACP options SHALL be rejected when the runtime catalog is
missing, stale, or internally inconsistent. A successful profile validation
SHALL return its source, normalized profile, catalog diagnostics, and a stable
non-sensitive fingerprint.

#### Scenario: Stale provider catalog is rejected

- **WHEN** an ACP profile selects a catalog-owned model from a stale or
  inconsistent catalog
- **THEN** validation SHALL fail before workflow dispatch
- **AND** the error SHALL direct the caller to refresh that backend catalog.

### Requirement: ACP provider and model form one selection tuple

The provider/model relationship SHALL be validated and compared semantically
before raw ACP model-id folding. A valid provider-plus-model selection SHALL
not be reported as `could_not_be_applied` merely because runtime normalization
stores the raw provider-qualified id.

#### Scenario: Provider-qualified model validates semantically

- **WHEN** a profile selects a model that belongs to the named model provider
- **THEN** validation SHALL accept the tuple and return its canonical flat
  provider-options representation
- **AND** runtime normalization MAY derive the provider-qualified raw model id.
