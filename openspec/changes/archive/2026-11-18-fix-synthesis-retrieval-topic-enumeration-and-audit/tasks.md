# Tasks

## 1. Authoritative Topic enumeration

- [x] 1.1 Exclude verified historical paths in the canonical store search snapshot. Verify that an updated current snapshot occupies the single candidate slot after reopen, and document the shared enumeration in `docs/synthesis-layer/persistence-and-files.md`.
- [x] 1.2 Preserve stable canonical source failure codes and verify that the production Rust route can publish vectors with a historical Topic copy present. Keep the unavailable-source regression for unreadable live material.

## 2. Retrieval failure audit

- [x] 2.1 Emit a bounded failure diagnostic from the retrieval maintenance terminal commit and persist it in the Host supervisor. Verify one error per failed or timed-out operation with diagnostics enabled or disabled, including receipt polling and replay.
- [x] 2.2 Apply the Host read audit to private Library retrieval. Verify single entries for rejected input, missing readiness, RPC failure, and invalid results, and silence for a successful lexical fallback. Document both failure paths in `docs/synthesis-layer/sidecar-runtime-supervision.md`.

## Verification record

The implementation run passed 139 targeted Node tests, 83 targeted Rust tests, TypeScript checks, Clippy, formatting, and capability inventory checks. The test environment used an isolated profile and the production Rust route. Verification with the affected user's Zotero profile and a newly packaged XPI remains pending.
