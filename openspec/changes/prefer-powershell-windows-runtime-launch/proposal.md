## Why

Windows ACP backends that resolve to npm `.cmd` shims currently launch through `cmd.exe /d /c`, which can fail in Zotero-hosted ACP stdio sessions when the workspace path contains non-ASCII characters. The platform layer already owns runtime command discovery and startup caching, so Windows command launch wrapping should be decided there instead of being reinterpreted by ACP transport code.

## What Changes

- Extend runtime command resolution with a cached launch specification for each resolved startup command.
- Use PowerShell as the default Windows wrapper for resolved `.cmd` and `.bat` commands.
- Keep direct execution for resolved `.exe` commands and non-Windows commands.
- Update ACP backend launch and runtime dependency probes to consume the platform launch specification instead of building their own `.cmd` shell wrapper.
- Remove ACP transport's default `cmd.exe /d /c` wrapping for Windows command shims.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Runtime command resolution now includes the platform-owned launch form used by ACP launch and runtime dependency probes.

## Impact

- Affects shared runtime command resolution in `src/platform/command.ts`.
- Affects ACP subprocess launch in `src/modules/acpTransport.ts`.
- Affects ACP runtime dependency probes in `src/modules/acpRuntimeDependencyWrapper.ts`.
- Updates runtime platform and ACP transport tests.
