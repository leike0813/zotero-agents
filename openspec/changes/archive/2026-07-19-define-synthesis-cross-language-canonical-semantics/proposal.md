## Why

The frozen Node Synthesis sidecar exposes a broad v1 process boundary, but its DTO validation, canonical JSON semantics, schema identity, and runtime bundle identity remain implicit in TypeScript. The contracts package also imports the repository package at runtime to obtain the foundation schema version. A Rust process cannot safely reproduce this behavior from TypeScript types, locale-sensitive comparisons, and scattered rebuilders without first freezing a language-neutral contract and conformance oracle.

## What Changes

- Add a versioned JSON Schema Draft 2020-12 contract set for every currently implemented v1 service, worker, launch, ownership, discovery, compute, transfer, canonical-inspect, Workbench-chrome, and Node runtime-bundle process boundary.
- Add versioned positive and negative corpora that define normalized canonical outputs, canonical UTF-8 bytes and SHA-256 hashes, and stable error codes.
- Add a contract-set manifest with schema/corpus inventory, capability-to-definition mappings, and a computed whole-set fingerprint.
- Move canonical JSON serialization and hashing into `packages/synthesis-contracts` as the single implementation while retaining the engine export path as a compatibility re-export.
- Move the repository foundation schema version into the contracts package and retain the repository export name as a compatibility re-export.
- Add a strict Ajv-based development checker and Core 218 conformance coverage without loading Ajv or schemas in the sidecar runtime bundle.
- Repair the existing Core 193 workflow assertion so it validates the macOS code-signature gate semantically instead of requiring the removed `spctl --assess` command text.
- Extend the blocking Stage 1 Node suite through Core 218 and update active Rust migration documentation to mark R1 complete.

## Capabilities

### New Capabilities

- `synthesis-cross-language-sidecar-contract`: Defines the complete v1 process-boundary inventory, strict schema/corpus governance, TypeScript oracle conformance, canonical bytes and hashes, dependency direction, and contract-first rule for future Rust DTOs.

### Modified Capabilities

- `synthesis-sidecar-stage1-node-milestone-gate`: Extends the blocking milestone inventory through Core 218.
- `synthesis-layer-doc-system`: Records completion of Rust migration R1 while making clear that no Rust executable or production ownership change exists yet.

## Impact

- Contracts: `packages/synthesis-contracts` gains canonical utilities, schema-version ownership, JSON schemas, corpora, manifest, and a checker.
- Compatibility exports: `packages/synthesis-engine` and `packages/synthesis-repository` keep their established public export names while delegating to contracts.
- Tests/governance: Core 193 is made resilient, Core 218 is added, and the Stage 1 suite becomes Core 175-218 with shards `[27, 1, 16]`.
- Documentation: the Rust migration plan and Synthesis status documentation identify R1 as complete and Metrics as the next vertical slice.
- Runtime: production routing, owners, Node bundle/pointer v1, emitted sidecar behavior, and packaged assets do not change.
