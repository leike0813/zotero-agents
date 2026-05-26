## Why

Managed file paths are currently validated inconsistently. The unified
filesystem service can safely perform writes, but callers may still pass
plugin-generated relative paths derived from long titles, references, raw ids,
or untrusted import entries. This can create overlong filenames, reserved names,
case collisions, or platform-specific paths that fail late in IO.

At the same time, a user-selected Zotero DataDirectory can legitimately be deep
or long. The plugin should not reject writes only because the absolute root is
long. The strong contract needs to apply to plugin-generated managed relative
paths, while absolute path length is reported as a diagnostic warning unless
the underlying IO fails.

## What Changes

- Add managed path governance for plugin-owned relative paths: separator
  normalization, safe segment validation, reserved name checks, trailing
  dot/space rejection, case-collision detection, and relative path budgets.
- Treat managed absolute path length as a warning diagnostic by default, not a
  hard failure caused by the user's persistence root.
- Upgrade Synthesis canonical asset path validation so canonical transactions
  fail before staging when changed or deleted assets violate managed path
  policy.
- Add short stable canonical asset filename helpers for high-entropy or
  semantic ids, and route citation graph asset naming through those helpers.
- Extend Git Sync import validation and persistence integrity scanning with the
  same managed relative path policy.
- Document the managed path contract in persistence governance docs.

## Capabilities

### Modified Capabilities

- `runtime-persistence-governance`: Defines managed relative path validation,
  absolute path diagnostics, and integrity scan reporting for path-policy
  issues.
- `synthesis-layer-foundation`: Requires canonical transactions to validate all
  asset paths before staging/promote/receipt/event/projection stale changes.
- `synthesis-literature-registry-citation-graph`: Requires high-risk citation
  graph asset filenames to use short stable managed filenames.
- `synthesis-git-sync`: Requires import snapshots to reject unsafe managed
  relative asset paths before promotion.

## Impact

- Affects runtime persistence helpers, Synthesis canonical foundation,
  literature registry canonical asset naming, Git Sync import validation,
  persistence integrity scanner, and focused tests.
- Does not migrate or rename existing legacy files automatically, does not
  delete old assets, does not require users to shorten their DataDirectory, and
  does not govern external user-selected import/export paths.
