## Why

The Synthesis Rust sidecar repair series has closed the audited production defects, but its merge evidence is stale and incomplete. All four application differential gates currently fail, the governed 2k/10k/25k performance run stops during fixture setup without samples, and the full core suite first fails while importing a deleted legacy service export and then exposes additional stale strict-DTO fixtures. A candidate cannot be accepted while those source-fresh gates are red.

## What Changes

- Restore application parity without deleting valid Rust migration behavior: align the Node Topic oracle and restart reconciliation with the fixed baseline, update the WebDAV parity Host fixture, and centralize the one exact schema-marker allowance.
- Materialize every synthetic sidecar asset named by the Topic manifest so the existing production-route performance gate measures the current candidate instead of failing setup.
- Remove the final core-suite dependency on the legacy Synthesis service owner and align tests, shared harnesses, request security ordering, and strict protocol error classification with the current recursive DTO contract.
- Keep runtime diagnostics release elision strict while distinguishing the production TraceContext contract marker from diagnostics-only implementation markers.
- Record one source-fresh evidence chain against `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c` without changing the public capability roster, operation roster, schema versions, dependencies, or performance budgets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-application-foundation`: Require the Node Topic oracle to preserve and project the fixed-baseline readiness and freshness contract.
- `synthesis-native-production-routing`: Preserve authentication and lifecycle precedence before capability DTO validation and stable request/result error classification.
- `synthesis-persistence-performance`: Require synthetic manifests to materialize every locator before governed production-route sampling.
- `synthesis-rust-sidecar-migration-governance`: Require source-fresh application parity, scale evidence, and an unfiltered full core suite before acceptance.
- `synthesis-sidecar-recursive-dto-contracts`: Require strict test fixtures and harnesses to use current recursively concrete DTOs without legacy defaults.

## Impact

The change affects the TypeScript Topic application and repository oracle, the Rust typed parity driver, four application parity checkers, the synthetic benchmark fixture, Synthesis service validation order, protocol error mapping, existing core fixtures and harnesses, runtime-diagnostics release checks, and the premerge audit report. It adds no dependency, runtime fallback, public capability, schema version, release action, or prebuild.
