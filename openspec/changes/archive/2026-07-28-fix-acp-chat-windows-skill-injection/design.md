## Context

ACP Chat joins its workspace, project Skill root, and whitelisted Skill id, then
checks that the target remains below the workspace. The current resolver converts
both paths to forward slashes for that check and returns the converted target.
On Windows, the returned `C:/...` value reaches the staging-directory fallback in
`runtimePersistence`, where `Zotero.File.pathToFile` can reject it.

ACP Skills does not expose this defect because its run-local proxy targets retain
native paths and normally materialize thin proxies rather than directly copying
each complete Skill tree into every configured backend root.

## Goals / Non-Goals

**Goals:**

- Keep portable comparison syntax separate from native filesystem syntax.
- Give runtime tree copy a defensive native-path boundary.
- Make the final injection diagnostic accurately reflect missing and failed
  targets.

**Non-Goals:**

- Change when the plugin scans the Skill registry.
- Change the injected whitelist or configured-backend root union.
- Turn the ownership manifest into a materialization-success ledger.
- Change ACP Skills materialization.

## Decisions

### Preserve the joined target and compare a normalized copy

The ACP Chat target resolver returns the result of the native `joinPath` call.
Separate portable copies are used only for containment checking. This removes the
conversion at its source without introducing a second path-joining algorithm.

### Reuse the existing native-path normalizer at the copy boundary

Runtime directory creation and tree copy reuse `normalizeNativeLocalPath`.
Source, target, staging, and backup paths therefore remain valid for Node,
IOUtils, and Zotero file-object fallbacks.

### Keep manifest ownership and readiness separate

The manifest remains a precommitted authorization boundary so reconciliation
cannot write or delete unowned directories. The final diagnostic is computed
from the current scan and copy attempts: any missing Skill, failed target, or
missing root prevents `ready`.

## Risks / Trade-offs

- [A caller supplies a non-local URI] → Existing native-path assertions continue
  to reject unsupported paths.
- [A refresh fails while an older managed copy remains] → Preserve the atomic
  copy rollback, report the refresh failure, and do not claim full readiness.
- [Diagnostics become large] → Aggregate counts and compact target records rather
  than embedding file contents or exception stacks.
