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
