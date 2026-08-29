# synthesis-sidecar-durable-bundle-export-foundation Specification

## Purpose

Define typed Rust parity and supersession safety for durable bundle export.

## Requirements

### Requirement: Durable export SHALL expose typed Rust parity
The Rust application SHALL strictly read legacy v1 and current v2 bundles, write only deterministic v2 bundles for all 23 entity kinds, enforce the shared four-MiB limit, capture repository and canonical bases coherently, and publish assets before the manifest.

#### Scenario: Durable export is superseded
- **WHEN** either the repository aggregate basis or any canonical Topic basis changes during capture
- **THEN** the export fails with the stable supersession code
- **AND** no manifest is published

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
