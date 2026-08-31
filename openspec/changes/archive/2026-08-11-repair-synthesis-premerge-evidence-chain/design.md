## Context

The functional repairs preceding this change are already present at `bd25af9b`, and the recursive DTO change is archived. The remaining failures are evidence-chain defects: the Node application oracle predates fixed-baseline Topic readiness semantics, parity drivers omit an explicit restart lifecycle step, a WebDAV Host fixture uses an obsolete result shape, synthetic manifests point at absent assets, and full-core fixtures still depend on legacy ownership or permissive nested DTOs.

The executable behavior baseline remains `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`. Rust production behavior is not changed merely to make an obsolete oracle green.

## Goals / Non-Goals

**Goals:**

- Produce source-fresh green results from all four application differential gates, the existing 2k/10k/25k performance gate, and the complete unfiltered core suite.
- Keep each intentional differential explicit, exact, role-specific, and owned by one policy module.
- Repair stable runtime contracts centrally and update stale fixtures without weakening recursive DTO validation.
- Preserve bounded query, memory, latency, concurrency, and Host-effect budgets.

**Non-Goals:**

- Change the public operation or capability roster, protocol schema versions, dependencies, persistence format, or performance thresholds.
- Restore the legacy plugin or Node sidecar owner.
- Perform Zotero desktop smoke, prebuild, release, publishing, or Gitee synchronization.

## Decisions

### Application parity uses one exact normalization policy

The redirect-graph migration marker is durable Rust schema state and remains in production. One shared parity policy may omit only the exact Rust row `reference_redirect_graph_schema_version = synthesis-reference-redirect-graph.v1`. It must not ignore the table, a wrong value, a Node-side marker, or any other row.

### Topic readiness remains application-owned

The Node Topic application will compute the same dependency snapshot, completeness, freshness, stale/dirty reasons, and discovery readiness fixed by the baseline. Empty patches inherit existing definition, resolver, and paper-set state. Reference artifacts are read in batches per page so parity restoration cannot reintroduce N+1 access.

### Restart reconciliation remains explicit

Repository open remains free of lifecycle side effects. The Rust parity driver explicitly performs startup reconciliation after reopening, while the Node repository emits the fixed `service_restart` phase, label, and structured diagnostic for generic stale work.

### Synthetic manifest and assets share one fact source

The benchmark fixture owns one local map of sidecar payloads. Manifest locators and JSON assets are derived from it together. Production parsers remain strict when a locator is not materialized.

### Security and contract failures retain direction-specific ownership

The service reads a bounded body and authenticates the bearer before exposing detailed capability-validation failures. Envelope and lifecycle authorization precede recursive capability decoding. Request conversion failures remain `invalid_request`; invalid capability results are server-owned `internal` failures. Neither path coerces or drops invalid values.

### Tests follow behavior and current SSOTs

The legacy service test uses the native client composition seam. Shared setup resets default client state between cases. UI render stability is verified over the complete relevant branch instead of a fixed source-character window, and CI ordering is asserted from `ci-gate-plan.ts`. Strict DTO fixtures reuse the protocol corpus and shared production-route harness wherever possible.

### TraceContext identity is not diagnostics implementation

`synthesis-sidecar-observation.v2` is an allowed production protocol marker. Diagnostics-exclusive module bytes must still be zero, and trace snapshot, patch, and event-bus markers remain forbidden in release output.

## Risks / Trade-offs

- **A narrow parity allowance hides new drift** → Match role, table key, and value exactly and keep every remaining row observable.
- **Fixture repair exposes real performance regression** → Retain all existing budgets and optimize the measured production path rather than changing thresholds.
- **Full core reveals more stale fixtures** → Continue classifying each failure against current schemas and behavior; never skip cases or restore compatibility defaults.
- **Authentication ordering masks malformed bodies** → Preserve bounded transport/framing errors, then authenticate before capability-specific validation details.

## Migration Plan

1. Capture current failures and add focused red tests around Topic/restart, manifest locator completeness, strict error classification, and suite isolation.
2. Repair parity and performance fixtures, then run their direct gates.
3. Repair the full core suite by shared contract family, keeping cleanup and Host seams explicit.
4. Run TypeScript, Rust, cross-language, diagnostics, Stage 1, performance, and unfiltered full-core gates.
5. Append the source identity and final evidence to the audit without rewriting prior findings.
