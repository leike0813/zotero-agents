## Context

See `proposal.md` for motivation. Zotero 10 changed the library-tree selection surface from singular getters to plural selection methods, while the public Workflow Host API still exposes scalar `libraryId` and `currentCollection` fields. Version classification is also duplicated across several runtime diagnostics.

## Goals / Non-Goals

**Goals:**

- Keep one public scalar DTO contract across Zotero 7, 9, and 10.
- Make supported runtime-major reporting consistent across all consumers.
- Publish Content Package 0.7.4 to stable and beta with a bounded Zotero range.

**Non-Goals:**

- Expanding the public DTO to return multiple libraries or collections.
- Backporting dev-branch Zotero source-reference governance or source submodules.
- Changing Content API v3 or adding Zotero-version-specific provider branches.

## Decisions

### Preserve the scalar host contract at one selection boundary

The shared context builder reads plural rows/ids first and falls back to legacy singular getters only when the plural API is absent. It deduplicates valid library ids and returns a scalar only for a unique result. The broker derives `currentCollection` from exactly one row. This keeps ambiguity handling in one boundary and avoids per-consumer Zotero-version checks.

Alternative considered: expose arrays in the public DTO. That would widen Workflow Host API v8 and force an unnecessary migration in a maintenance release.

### Centralize runtime-major normalization

A shared parser owns the `7 | 9 | 10 | unknown` union and every diagnostic/runtime consumer uses it. This removes duplicated parsing and makes future supported-major changes one edit.

Alternative considered: add `10` independently to each module. That would preserve the existing drift risk.

### Keep compatibility ranges declarative and bounded

The XPI manifest declares Zotero 7 through 10, while Content Package 0.7.4 declares Zotero `>=7 <11`, plugin `>=0.8.0`, and content API `^3.0.0`. Stable and beta reuse the existing explicit channel-selection release path; dev is not part of this publication.

## Risks / Trade-offs

- [Multiple selected rows cannot be represented by the scalar DTO] → omit ambiguous scalar fields rather than guessing.
- [A future Zotero major remains classified as unknown] → expand the shared parser and declarative ranges only after compatibility is verified.
- [Real-host behavior can differ from mocks] → retain focused contract tests and verify the built XPI on Zotero 10 before the plugin release.

## Migration Plan

1. Merge the selection and runtime normalization changes without changing stored data or public DTO schemas.
2. Publish Content Package 0.7.4 to stable and beta after the commit is present on GitHub main.
3. Release plugin v0.8.4 separately after the project release gates and real Zotero 10 validation are satisfied.
