# Design

## Context

See proposal.md for motivation. ACP build/package scripts are small independent Node entrypoints; the crate targets Windows MSVC and has its own Cargo.lock. Existing ACP packaging tests already cover XPI checksum verification. The preflight skill owns the multi-component preparation workflow.

## Goals / Non-Goals

**Goals:** one source of truth for the bridge target, input inventory and evidence validation; public build, package and check seams testable with temporary files and a Cargo process substitute.

**Non-Goals:** changing runtime protocol, Host Bridge release identities, adding CI or dependencies, or encoding the whole preflight skill as another runner.

## Decisions

- Share ACP-specific paths, content fingerprint and evidence validation in `acp-ws-bridge-build.mjs`. Hash sorted relative paths and content for Cargo.toml/lock, src tree, build/package/shared logic, and optional local Cargo/toolchain/build configuration. Ignore HEAD, mtimes and target output; include uncommitted and untracked inputs. Normalize text line endings so equivalent Windows/Linux checkouts agree.
- Write `zotero-acp-bridge.build.json` beside the local compiled exe, then preserve it beside the packaged exe. Include schema, target/platform, buildFingerprint, sourceHead, binary checksum and size. Only the successful Windows build creates this record; standalone package verifies it. A checksum alone cannot establish source provenance.
- Capture fingerprint before and after locked Cargo compilation. Invalidate previous local evidence before compilation; failed or changing-input builds cannot re-certify output. Packaging reads validated binary bytes before writing, then checks packaged freshness. Missing/invalid evidence and stale inputs return structured diagnostics.
- Keep Node imports entirely in tooling. Export the existing build/package operations and inject only the process runner/platform boundary for tests; CLI defaults remain unchanged. The freshness CLI emits JSON with `ok`, `code`, and diagnostic details, and exits nonzero on failure.
- Update skill defaults and AGENTS build rule in place. Explicit limited requests and outer build ownership take precedence over the default final build.

## Risks / Trade-offs

- Evidence is a development build receipt, not signed reproducibility evidence for arbitrary external compiler environments. It proves this pipeline's successful compilation and source/output association.
- Existing exe has no source-bound receipt → perform one actual Windows rebuild, keeping a backup of tracked native assets before replacement.
- Interrupted multi-file packaging can leave inconsistent files → freshness rejects partial sets and a repeat package from verified local output restores them; preserve backups during real preflight.
- Additional relevant inputs must remain in the shared inventory when build behavior expands; tests cover additions/deletions and build scripts as well as source edits.
