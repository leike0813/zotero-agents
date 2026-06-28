## Why

Windows ACP backends and runtime dependencies rely on Windows command shims from npm, nvm, uv, and other toolchains. The platform layer already owns runtime command discovery and startup caching, so Windows command candidate ordering, shim normalization, and launch wrapping should be decided there instead of being reinterpreted by ACP transport code.

## What Changes

- Extend runtime command resolution with a cached launch specification for each resolved startup command.
- Include `.ps1` shim candidates during Windows command preflight.
- Prefer Windows command candidates by executable priority: `.exe` > `.ps1` > `.cmd` > `.bat`.
- Best-effort promote resolved `.ps1`, `.cmd`, or `.bat` shims to verified `.exe` targets when an equivalent or directly referenced executable exists.
- Keep direct execution for resolved `.exe` commands and non-Windows commands; keep suffix-appropriate wrappers for unresolved shims.
- Update ACP backend launch and runtime dependency probes to consume the platform launch specification instead of building their own `.cmd` shell wrapper.
- Remove ACP transport's default shim interpretation so it consumes the platform launch plan as the single source of truth.

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
