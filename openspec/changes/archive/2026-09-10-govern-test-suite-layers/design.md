## Context

See `proposal.md` for motivation. The existing runner combined hundreds of unrelated tests under `tests/core`, while Zotero membership was duplicated between aggregate imports, mode filters, and runner configuration. Test governance must remain simple enough to inspect directly and must not add tests that only validate other tests.

## Goals / Non-Goals

**Goals:**

- Give every deterministic test one production owner and one runnable shard.
- Make real-host coverage derive from directory placement alone.
- Keep `lite` small enough for pull requests while covering critical Zotero boundaries.
- Remove assertions that fail on harmless implementation or prose edits.

**Non-Goals:**

- Raising coverage targets or adding a test-governance framework.
- Changing product runtime behavior.
- Automating subjective test-value scoring.

## Decisions

### Ownership directories replace the core bucket

Tests live under domain roots such as `tests/acp`, `tests/host-bridge`, `tests/runtime`, and `tests/workflows`. A small runner inventory maps files to focused shards and fails on duplicate or missing ownership. This retains one executable entry point while avoiding another hierarchy abstraction.

Alternative: keep `tests/core` and classify by title or numeric ranges. Rejected because names do not reliably express runtime ownership and renames silently change membership.

### Zotero membership is filesystem-owned

The Zotero plugin test configuration recursively discovers direct test files under domain `lite` and `full` directories. `full` composes both directories. One shared setup file installs grep handling and diagnostics; no aggregate `suite.test.ts` files remain.

Alternative: retain aggregate imports or allowlists. Rejected because they duplicate the filesystem inventory and permit stale omissions.

### Runtime affinity follows the required execution environment

Deterministic logic stays in Node. Tests enter Zotero only when the assertion requires host APIs or behavior, with stable critical paths in `lite` and slower host interactions in `full`. Mixed files are split or have dead host-only tails removed.

### Toxic tests are deleted, not replaced with meta-tests

Static instruction prose, source-shape checks, duplicate environment-neutral cases, brittle private monkeypatches, and test-policy tests are removed. Public schemas, wire artifacts, release identities, executable packaging, and observable behavior remain valid seams.

## Risks / Trade-offs

- **Risk:** broad file moves can leave stale paths in scripts or documentation. → The shard inventory, TypeScript compilation, targeted domain runs, and repository search validate references.
- **Risk:** a smaller suite can miss a removed assertion's intent. → Removal is limited to unstable implementation/prose seams; public artifacts and observable behavior remain covered.
- **Risk:** `lite` adds pull-request time. → It contains only stable non-interactive host checks and runs domain files directly.

## Migration Plan

1. Move deterministic tests into ownership directories and update imports and script references.
2. Replace the runner and package command surface, then update CI and release gate plans.
3. Move real-host tests into direct `lite`/`full` directories and remove aggregate/filter infrastructure.
4. Prune toxic cases and validate Node inventory, domain suites, Zotero `lite`, Zotero `full`, and static checks.

Rollback is a normal source revert; no runtime data or external state is migrated.
