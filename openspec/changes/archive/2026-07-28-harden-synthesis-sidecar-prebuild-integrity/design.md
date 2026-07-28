## Context

The prebuild workflow is manually dispatched and already packages seven
content-addressed bundles.  Its checkout is pinned to `source_sha`, but the
workflow file is selected by the dispatch ref; a caller can therefore run a
newer workflow against an older source.  The Rust worker has an intentional
compile-time fingerprint hook, while the workflow currently leaves that hook
unset.  Bundle directory verification exists but does not bind provenance to
the expected Rust source fingerprint, and CI unpacks artifacts before the
staging command has asserted the exact input set.

## Goals / Non-Goals

**Goals:**

- Make a prebuild result evidence for one source and one workflow revision.
- Make every compiled worker report the provenance fingerprint that its smoke
  test expects.
- Reject malformed, incomplete, or source-mismatched prebuild artifacts before
  the prebuild branch is written.

**Non-Goals:**

- Rebuild or alter historical prebuild objects and failed workflow runs.
- Change the release-set or receipt schemas, add platform code signing, or
  dispatch a remote prebuild as part of this implementation.

## Decisions

- The workflow SHALL require `source_sha == GITHUB_SHA`.  This is simpler and
  stronger than recording a second workflow SHA in the result schema; it keeps
  every fingerprint input in the checked-out commit.
- The plan job computes the Rust source fingerprint.  Each build job recomputes
  it, requires equality with the plan output, and supplies it through
  `SYNTHESIS_RUST_BUILD_FINGERPRINT` to both native Cargo and Zig builds.
  This uses the worker's existing compile-time contract rather than adding a
  runtime override.
- Bundle verification gains an optional expected source fingerprint.  The
  package command invokes it after writing its manifest; staging and syncing
  pass the source fingerprint recorded by their governing manifest.
- Archive admission is centralized with staging: it verifies the exact seven
  archive names and target-only safe paths, extracts to an isolated directory,
  checks the resulting directory set, then performs the existing per-bundle
  digest validation before creating an aggregate.  The workflow no longer has
  an unverified shell extraction stage.

## Risks / Trade-offs

- [Historical-source dispatch becomes unavailable] → A release-grade prebuild
  must use the exact current commit and a fresh request ID; failed runs remain
  auditable through their existing run records.
- [Archive validation adds a small CI cost] → It runs once after all matrix
  jobs and before the only remote write, avoiding expensive recovery from a
  bad aggregate.
- [Fingerprint mismatch can fail every matrix job] → The plan-job output and
  per-job equality check make the cause explicit before compilation.

## Migration Plan

Ship the workflow and script changes together on the source branch.  The next
manual prebuild uses that branch's exact HEAD and a new request ID.  Failed
runs with the old request ID and the existing prebuild branch remain untouched.
If the new checks reject an input, correct the source and dispatch a new exact
identity; no set is written before all validation passes.
