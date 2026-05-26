## Path Policy Layers

The managed filesystem policy has three layers:

- **Managed relative path**: a plugin-generated path relative to a managed root.
  This is strongly validated and fails fast.
- **Managed absolute path**: a managed root plus managed relative path. Absolute
  path length is diagnosed as `managed_absolute_path_long` but is not rejected by
  default because the user may intentionally choose a deep DataDirectory.
- **External user path**: a user-selected import/export path. This change does
  not automatically rewrite or reject these paths beyond the existing caller
  contract.

## Relative Path Rules

Managed relative paths must:

- use normalized `/` separators;
- be non-empty and relative;
- contain no `.` or `..` traversal segments;
- contain no empty segment after normalization;
- use safe characters in every segment;
- not use Windows reserved device names, regardless of platform;
- not end any segment with a dot or space;
- keep each segment under the default 96-character budget;
- keep the full managed relative path under the default 220-character budget;
- avoid case collisions inside the same directory.

The default transaction id budget is 64 characters. Transaction ids may be
compacted to a stable short id rather than rejected when callers provide long
semantic ids.

## Canonical Assets

Synthesis canonical assets use the managed relative path policy plus KG scope
constraints. The first path segment must be one of:

- `topics`
- `concepts`
- `topic-graph`
- `citation-graph`
- `tags`
- `sync`

`writeCanonicalTransaction()` and
`writeCanonicalEnvelopeTextTransaction()` validate every changed and deleted
asset before staging. If validation fails, they do not create staging files,
target files, receipts, events, diagnostics transaction side effects, or
projection stale marks.

Domain code should not derive filenames directly from long labels, titles, raw
references, or ids. It should use short stable helpers such as
`canonicalAssetFileName(prefix, stableId)` and
`canonicalAssetPath(scope, collection, prefix, stableId)`.

## Diagnostics

Path policy diagnostics use structured codes:

- `managed_path_invalid`
- `managed_path_reserved_name`
- `managed_path_segment_too_long`
- `managed_relative_path_too_long`
- `managed_path_case_collision`
- `managed_absolute_path_long`

Diagnostics must not expose tokens, authorization headers, credential-bearing
URLs, or raw sensitive absolute paths. Integrity reports may include managed
relative paths and path scope identifiers.

## Non-Goals

- No automatic migration of old filenames.
- No deletion of old assets.
- No forced shortening of user-selected DataDirectory roots.
- No automatic rewriting of external user import/export paths.
