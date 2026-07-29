## MODIFIED Requirements

### Requirement: Sidecar prebuilds SHALL be exact content-addressed sets

The repository SHALL store release-eligible Synthesis native runtime prebuilds
on `synthesis-sidecar-runtime-prebuilds` under `sets/<aggregate>/`. Each set
SHALL have exactly seven target archives, a complete archive-digest manifest,
and a `synthesis-sidecar-runtime-prebuild-result.v2` document that binds the
run, request, source, build fingerprint, aggregate, prebuild commit, immutable
set path, cache-hit targets, cache-miss targets, and cache source runs.

#### Scenario: A verified set is synchronized
- **WHEN** synchronization receives a v2 result and its declared immutable set
- **THEN** the result identity, exact seven-target cache partition, set
  manifest, archive digests, and bundle manifests SHALL all validate
- **AND** an unknown field, incomplete cache partition, duplicate target, or
  mismatched identity SHALL fail before add-on bytes are replaced
