## Context

The uncommitted v2 Product layout places all Topic and paper files directly in shared `topics/` and `papers/` directories. Its Markdown rewriter also replaces every readable local image with a synthetic `assets/mN/` path. The existing portable literature bundle relies on that default rewriter behavior and must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Restore one navigable directory per materialized Topic and paper.
- Preserve valid Markdown image relationships below the Markdown source directory.
- Make accepted image ownership visible in the paper manifest and preserve all existing integrity data.

**Non-Goals:**

- Copy images outside the Markdown source tree.
- Dereference symlinks or add Host API filesystem capabilities.
- Change remote/data image handling or default portable literature-bundle output.

## Decisions

- Materialize Topic reports as `topics/topic-<n>/report.md`. Materialize each paper under `papers/paper-<n>/`, with metadata, source, and ordinal payload files directly in that directory.
- Add opt-in `assetPolicy: { kind: "preserve-source-tree" }` to the shared Markdown rewriter. Without this policy, its existing synthetic `assets/mN/` paths remain exact.
- Research Bundle evaluates allowed paths lexically after normalization against the source Markdown parent directory. Accepted assets use the normalized source-relative path inside the paper directory, and the Markdown is rewritten to that same relative path.
- Keep a local link unchanged when it is outside the source tree or missing. Record `markdown_image_outside_source_tree` or `markdown_image_missing`; remote and data links remain untouched.
- Add `source.assets` manifest records containing Product path and source-relative path. Keep schema version `2.0.0` because this revises the same unshipped v2 worktree contract.

## Risks / Trade-offs

- [Lexical containment does not resolve symlinks] → Document the limitation and do not claim physical-path containment.
- [Preserved external local links can be unavailable in the Product] → Retain the user's requested text fidelity and make the warning explicit in manifest and README.
- [Shared helper regression] → Make both callbacks optional and retain the existing portable literature-bundle regression test.

## Migration Plan

New Product materialization replaces the uncommitted flat v2 implementation in place. Existing cached v1 Products remain unchanged; no compatibility paths are emitted.

## Open Questions

None.
