## Why

The Rust Synthesis production client currently proves readiness by keeping the capability manifest, a duplicated Rust ready roster, six repeated handler registries, central capability-specific branches, and source-scanning checks synchronized. This spreads one routing concept across many modules and lets missing handlers remain a test-only discovery instead of a startup failure.

## What Changes

- Deepen the existing Rust `runtime_production_client` module so it owns manifest validation, route registration, readiness, dispatch, and the closed execution pipeline.
- Replace the duplicated ready roster with startup validation that every manifest route has exactly one handler and valid execution metadata, reporting all configuration issues before ready publication.
- Recompute the capability fingerprint from the embedded manifest in Rust instead of comparing the manifest with a duplicated Rust digest constant.
- Keep route declarations beside their domain handlers while removing repeated registration macros and central capability-string routing branches.
- Move canonical autosync route/result classification into closed route execution metadata while preserving dynamic write observation and maintenance epochs.
- **BREAKING (internal Rust library only)**: remove the unused public `synthesis_sidecar::production_capabilities` module without a compatibility facade.
- Update the directly coupled production-capability checker so language-neutral evidence no longer depends on Rust source layout, ready-roster constants, or handler macros.
- Preserve the production capability inventory, manifest schemas, discovery order, request/result envelopes, deadlines, receipts, transfer behavior, shutdown behavior, and stable wire errors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-production-routing`: Define manifest-owned route order, validated Rust route completeness, fail-fast readiness, fingerprint recomputation, and closed execution-plan routing.
- `synthesis-rust-sidecar-migration-governance`: Replace Rust ready-roster/source-shape evidence with behavioral catalog and dispatch verification while retaining language-neutral inventory gates.

## Impact

- Affects the Rust Synthesis sidecar production-client dispatcher, six typed surface modules, canonical autosync coordination, transfer ownership, runtime composition, shutdown release order, and focused Rust tests.
- Adds `sha2.workspace = true` to the `synthesis-sidecar` crate using the already locked workspace dependency; no dependency version or lockfile change is expected.
- Minimally updates `scripts/check-synthesis-production-capabilities.ts` and its existing Node tests. It does not change TypeScript product runtime, other Synthesis modules, public client methods, manifests, release artifacts, or publication state.
