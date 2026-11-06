# Spec Delta

## ADDED Requirements

### Requirement: Development surfaces preserve prerelease identity
Every development surface SHALL carry a development prerelease version and the exact development CLI identity. Development iteration SHALL NOT consume the stable surface patch. Stable surfaces SHALL retain the existing CLI major.minor plus layer-owned patch rule.

#### Scenario: Rendering a development surface
- **WHEN** CLI `0.5.2-dev.19` is rendered with a surface patch of `2`
- **THEN** the surface version is `0.5.2-dev.19`
- **AND** its embedded CLI identity remains `0.5.2-dev.19`.

#### Scenario: Rendering a stable surface
- **WHEN** stable CLI `0.5.2` is rendered with a surface patch of `3`
- **THEN** the surface version is `0.5.3` without a prerelease suffix.

#### Scenario: Rejecting a mixed release set
- **WHEN** any development surface points at a stable mutable ref or carries a stable version
- **THEN** release-set validation fails before publication.
