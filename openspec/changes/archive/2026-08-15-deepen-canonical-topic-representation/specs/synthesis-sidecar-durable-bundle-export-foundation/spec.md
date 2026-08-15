## ADDED Requirements

### Requirement: Durable export SHALL capture canonical Topics through canonical assets

Durable export SHALL obtain each current Topic as transport-neutral canonical assets and a typed basis from the canonical representation interface. The durable application SHALL continue to own envelope encoding, bundle manifests, aggregate basis recapture, and publication ordering.

#### Scenario: Canonical Topic is exported
- **WHEN** a current Topic remains unchanged across durable export capture and recapture
- **THEN** the emitted Topic asset paths, text, hashes, envelope fields, and bundle bytes remain identical to the existing v2 format
- **AND** durable export does not reconstruct section filenames or snapshot hashes outside the canonical representation interface

#### Scenario: Canonical Topic changes during export
- **WHEN** the typed canonical basis changes after asset capture
- **THEN** export fails with the existing stable supersession code
- **AND** no manifest is published

