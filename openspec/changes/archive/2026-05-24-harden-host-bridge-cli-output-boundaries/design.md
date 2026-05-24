## Context

The Host Bridge already protects file downloads through opaque file handles, but
workflow/task status data still reuses internal task records. Those records may
contain attachment paths, runtime diagnostic paths, and other host-local
implementation details. The Rust CLI also echoes the user-provided output path
after file downloads.

## Approach

- Add a single Host Bridge workflow/task DTO sanitizer and use it for submit,
  run status, and task list responses.
- Keep internal task runtime, dashboard history, and UI behavior unchanged.
- Omit unsafe `inputUnitIdentity` values from external DTOs instead of trying
  to preserve path-derived identifiers.
- Redact path-like substrings in external error strings as `[redacted-path]`.
- Keep user-facing labels such as `inputUnitLabel` because they are display
  names rather than filesystem authority.
- Change CLI download JSON to report `outputName` only. The CLI still writes to
  the requested path and still uses the full path internally for filesystem
  operations.
- Treat manifest `cli.supported` as protocol support, not current shell PATH
  availability.

## Edge Cases

- Non-path opaque identities remain visible.
- Multiple paths in one error string are all redacted.
- Windows and POSIX absolute paths are both redacted.
- Existing CLI overwrite and unwritable-output failures still include enough
  detail for users to identify the target filename.

## Non-goals

- Do not alter dashboard/internal task storage.
- Do not add a verbose CLI flag for full output paths.
- Do not make Host Bridge report current shell PATH installation state.
