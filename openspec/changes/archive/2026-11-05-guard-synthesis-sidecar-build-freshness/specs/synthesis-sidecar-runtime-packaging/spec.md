# Spec Delta

## ADDED Requirements

### Requirement: Ordinary plugin builds SHALL verify native runtime freshness

An ordinary plugin build SHALL verify all seven Synthesis sidecar runtime bundles before generating help documentation or packaging an XPI, and SHALL fail when any bundle is missing, stale, damaged, or has a mismatched fingerprint.

#### Scenario: A runtime bundle is missing, stale, or damaged

- **WHEN** an ordinary plugin build verifies the seven Synthesis sidecar runtime bundles and finds one that is missing, stale, damaged, or fingerprint-mismatched
- **THEN** the build fails before help-document generation or XPI packaging

#### Scenario: All seven runtime bundles pass freshness verification

- **WHEN** all seven Synthesis sidecar runtime bundles match the current runtime identity
- **THEN** the ordinary build continues through its existing build chain
