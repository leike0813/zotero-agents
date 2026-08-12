## Why

The Synthesis Rust sidecar currently has strict outer envelopes but still lets nested domain data escape through `unknown`, `SynthesisJsonObject`, and `serde_json::Value`. This allows missing or malformed nested fields to be replaced by empty defaults while existing gates report the route as typed.

## What Changes

- **BREAKING**: make every nested request, result, error, diagnostic, transfer, worker, reverse-Host, lifecycle, and runtime-bundle DTO recursively concrete and reject undeclared fields, aliases, nulls, and defaults.
- Establish one JSON Schema 2020-12 protocol registry for all 119 cross-process capabilities and 15 deterministic worker operations.
- Permit opaque JSON only through named, versioned, bounded leaf contracts whose consumers do not inspect the payload before owner-specific validation.
- Replace production TypeScript `Promise<unknown>` bridges and Rust domain `Value` parsing with capability-specific DTO maps and strict rebuilders.
- Require every output-transfer locator to bind `sessionId` to `rootSha256`.
- Add recursive schema, corpus, TypeScript/Rust parity, and roster completeness gates.

## Capabilities

### New Capabilities

- `synthesis-sidecar-recursive-dto-contracts`: Defines the protocol registry, recursive concrete-shape rule, bounded opaque leaves, and complete capability/worker mapping.

### Modified Capabilities

- `synthesis-client-contracts`: Requires concrete request and result types throughout the grouped client and production port.
- `synthesis-native-production-routing`: Requires strict capability-discriminated decoding instead of domain fallback parsing.
- `synthesis-cross-language-sidecar-contract`: Extends cross-language parity from selected lifecycle documents to the complete sidecar protocol.

## Impact

- Affects `packages/synthesis-contracts`, plugin Synthesis clients and reverse-Host handlers, Rust application/sidecar/protocol DTOs, contract checkers, corpora, route tests, OpenSpec, and Synthesis architecture documentation.
- Keeps the current 96 public client operations, 14 reverse-Host capabilities, production capability fingerprint, database schema, canonical formats, and dependencies unchanged.
- Requires coordinated plugin/sidecar delivery because legacy alias and empty-default parsing is intentionally removed atomically.
