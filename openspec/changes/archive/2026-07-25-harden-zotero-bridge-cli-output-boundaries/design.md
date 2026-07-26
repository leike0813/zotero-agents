## Context

The fixed baseline is commit `aa44a7a25dbb7c4ea262fa78793f00b8219dcfb1`.
The CLI parser remains the argv source of truth and
`schemas/host-bridge-cli-command-contracts.v1.json` remains the payload/result source
of truth. Output-boundary metadata belongs in that command registry rather than in a
renderer-local command-name set or broad capability classification.

The working tree already contains unrelated CLI prebuild/release/feed changes and an
`src/modules/acpSessionManager.ts` change. They are preservation-required and outside
this change.

## Decisions

### 1. Use one explicit command boundary object

Each command contract declares one `outputBoundary` object with `strategy` equal to
`fixed`, `cursor`, `offset`, `limit`, `file`, or `raw`. Strategy-specific fields carry
the collection section, default and maximum limits, continuation fields, truncation
field, or file-handle field. The surface generator copies this object verbatim after
schema validation; it does not infer pagination from command names.

### 2. Use criteria-bound keyset cursors for in-memory projections

The shared cursor stores a version, command scope, criteria fingerprint, issued time,
and the last stable row key. Continuation validates every field and fails with a
structured `invalid_host_bridge_cursor` error when malformed, scoped to another
command, bound to different filters, expired, or no longer anchored in the projected
collection. It never silently restarts at page one.

Collections that already use the Zotero SQL keyset cursor retain their database-aware
implementation but adopt the same 25/100 default and maximum and the same public page
fields.

### 3. Keep long text and file delivery separate

Text that remains semantically readable inline uses `offset`/`maxChars` with defaults
of 8,000 and 16,000 maximum characters. Complete exports, artifact payload bundles,
review input, and full diagnostics are written under runtime persistence and registered
through the existing Host Bridge file registry. Stdout contains only identity,
summaries, diagnostics, and a descriptor without local paths.

### 4. Preserve domain arrays and use nested pagination for multi-section DTOs

Single-collection responses retain their established array names. Multi-section
responses expose `pagination.<section>` so independent cursors cannot be confused.
Every page reports `returned`, `total`, `limit`, `hasMore`, and `nextCursor`.

### 5. Preserve agent-facing semantic depth

The Minimum Skill receives additive guidance for page traversal, cursor failure,
offset reconstruction, and file verification. No existing instruction is compressed,
merged, reordered, or removed. The only approved runtime payload removals are the five
bulk inline outputs named in `baseline.md`; no instruction deletion is authorized.

## Risks

- In-memory keyset pagination detects an anchor that disappeared and returns an
  explicit expired-cursor error; callers must restart intentionally.
- Strict result-schema validation will expose existing DTO drift. Runtime DTOs and
  descriptors therefore change together in the same task.
- File delivery creates short-lived runtime files. Existing file TTL, digest, and
  download verification remain authoritative.
