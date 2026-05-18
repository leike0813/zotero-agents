# Design

## Built-in workflow resource reader

Startup synchronization SHALL read packaged workflow files through a single
reader that tries deterministic candidates in this order:

1. `rootURI` based fetch.
2. `resourceURI` based fetch.
3. privileged XHR-style text request.
4. unpacked filesystem fallback from Zotero current working directory.
5. development cwd fallback.

Each candidate records its label, URI/path, and failure reason. If all
candidates fail, the thrown error includes compact diagnostics and the sync
caller records the same data in the workflow runtime state.

## Workflow registry diagnostics

The workflow runtime state SHALL include the latest built-in sync result. A
failed sync does not block startup, but subsequent registry/debug views can show:

- Zotero version.
- `rootURI` and `resourceURI` values used at startup.
- target built-in workflow directory.
- candidate read failures.
- loaded builtin/user workflow counts.

Each registry rescan SHALL also best-effort persist a diagnostic snapshot to
`<Zotero.DataDirectory.dir>/zotero-skills/workflow-registry-status.json`. The
file records the scanned user/builtin roots, loaded workflow summaries,
warnings, errors, loader diagnostics, Zotero version, and latest built-in sync
result. Diagnostic persistence must never make registry scanning fail.

Startup-time capability resolution SHALL treat `hiddenDOMWindow` as optional.
If Zotero 9 throws while resolving `Services.appShell.hiddenDOMWindow`, workflow
hook import and registry scanning must continue using global/addon/Zotero
capabilities that are available.

## Compatibility helpers

High-risk runtime APIs SHALL be accessed through feature-detected helpers:

- `delay(ms)`: prefers standard timers and only uses host delay APIs as a
  fallback.
- `getMozillaSubprocessModule()`: tries modern module import first, then the
  legacy `.jsm` path for older Zotero runtimes.
- File/path helpers prefer `IOUtils` / `PathUtils`; `OS.File` remains only as a
  last fallback where an existing feature needs it.

## Manifest compatibility

The plugin manifest SHALL declare:

- `strict_min_version`: `7.0`
- `strict_max_version`: `9.0.*`

This preserves Zotero 7 support while limiting the claim to the Zotero 9.0
range that this change targets.
