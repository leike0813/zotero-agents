# Design

## Platform Service Boundary

Create `src/platform/` as the single source of truth for platform-sensitive
runtime services:

- `runtimePlatform`: host platform detection from explicit override, Zotero
  flags, Node process, and Mozilla app info.
- `path`: native path joining, absolute path classification, parent/base name,
  portable slash normalization, and Zotero IO path normalization.
- `env`: runtime environment reads and PATH split/merge across `PATH`, `Path`,
  and `path`.
- `command`: command path candidate construction and non-interactive shell PATH
  fallbacks.
- `subprocess`: shared access to Mozilla/Zotero/Node process execution adapters.

Existing public helpers such as `src/utils/path.ts` remain as facades during the
migration so callers can move gradually without changing behavior.

## Windows Baseline

Windows is the known-good baseline. Platform services must preserve:

- Drive absolute paths in both `C:\dir` and `C:/dir` forms.
- UNC paths.
- `.cmd`, `.bat`, `.exe`, and PowerShell/cmd fallback resolution.
- Case variants of PATH environment variables.
- Existing Host Bridge CLI shim and bundled binary resolution behavior.

Tests that encode these behaviors are golden tests, not cleanup candidates.

## Linux/macOS Repair

Linux and macOS command resolution adds non-interactive PATH fallbacks for common
agent runtimes, including `~/.local/bin`, `/usr/local/bin`, `/usr/bin`,
`/bin`, and `/opt/homebrew/bin`. ACP launch diagnostics should name the command
and checked paths when resolution fails.

Runtime path construction should choose the path style from the root path when
the root is explicit. A Windows root path remains Windows-shaped even when a
Node test is running on Linux.

## Migration Order

1. Add platform services and keep old helpers as facades.
2. Migrate ACP transport command resolution.
3. Migrate Host Bridge CLI resolver/injection/installer.
4. Migrate SkillRunner ctl/local runtime manager and release installer.
5. Migrate runtime persistence and result-context path logic.
6. Update Zotero mock and cross-platform tests.

Each migration step must keep or add Windows golden assertions before replacing
local logic.
