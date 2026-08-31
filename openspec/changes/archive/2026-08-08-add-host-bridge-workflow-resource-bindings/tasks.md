## 1. Contracts And Baseline

- [x] 1.1 Record the Host Bridge semantic baseline at `0c04df86a855643cd02ea7699646056a3a79f193`, materialized package metrics, and empty deletion inventory.
- [x] 1.2 Add manifest and runtime types for resource requirements, invocation modes, bindings, immutable resource views, and output descriptors.
- [x] 1.3 Extend existing contract tests for manifest projection and validation before implementing the new fields.

## 2. Host Bridge Resource Lifecycle

- [x] 2.1 Extend workflow validate/submit DTO tests for opaque input handles, output delivery, eligibility, path rejection, and structured errors.
- [x] 2.2 Implement bridge-upload resolution and submission-level leases without consuming handles during validation.
- [x] 2.3 Carry resource bindings through preparation, queue admission, units, run/apply seams, cancellation, and terminal cleanup while keeping handles and leases explicitly process-scoped.
- [x] 2.4 Add run-scoped output allocation/finalization and register completed outputs through the existing workflow artifact download registry.
- [x] 2.5 Enforce non-interactive interaction rejection before GUI picker, editor, or confirmation APIs can run.

## 3. Workflow And CLI Integration

- [x] 3.1 Add GUI resource adapters and migrate built-in literature bundle and notes import/export hooks to the shared resource API.
- [x] 3.2 Add structured non-interactive notes-import conflict behavior with `error` as the default.
- [x] 3.3 Extend CLI args, payload composition, offline schemas, result schemas, help, and Agent Surface source contracts for resource bindings and output descriptors.
- [x] 3.4 Update minimum-core and generated workflow catalog semantic sources without editing generated targets directly.

## 4. Verification

- [x] 4.1 Run focused TypeScript tests for manifest/runtime, workflow control, file downloads, queue lifecycle, and migrated built-in workflows.
- [x] 4.2 Run focused Rust CLI tests and command-contract/schema parity checks.
- [x] 4.3 Run OpenSpec strict validation, type checking, and relevant lint/build checks.
- [x] 4.4 Run Host Bridge semantic review, renderer, baseline-relative package-depth gate, and report zero unmapped, downgraded, unauthorized dropped, and intra-package duplicate semantics.
