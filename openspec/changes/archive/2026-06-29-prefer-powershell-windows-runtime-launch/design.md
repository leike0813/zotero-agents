## Context

Runtime command discovery is already centralized in the platform layer and cached at startup. Windows runtime commands can resolve to several forms of the same tool: a real `.exe`, a PowerShell `.ps1` shim, a `.cmd` shim, or a `.bat` shim. ACP transport should not reinterpret these forms. The platform preflight should normalize the best available command path and cache the launch shape that consumers reuse.

## Goals / Non-Goals

**Goals:**

- Make the platform command layer own both command resolution and launch wrapping.
- Cache the resolved launch shape during startup preflight for known runtime commands.
- Include `.ps1` shims in Windows preflight candidates.
- Prefer Windows command candidates by suffix priority: `.exe` > `.ps1` > `.cmd` > `.bat`.
- Promote shims to a verified `.exe` target when this is unambiguous.
- Reuse the same launch shape for ACP backend launch and dependency probes.

**Non-Goals:**

- Do not add per-launch retry between shell wrappers.
- Do not rewrite npm `node.exe + cli.js` shims into partial executable invocations unless the launch arguments can be preserved exactly.
- Do not install npm packages or repair user PATH/nvm configuration.

## Decisions

- Add a launch specification to `RuntimeCommandResolution`.
  - Rationale: the startup registry is the lifecycle-scoped source of truth, and launch wrappers should not be recomputed by business modules.
  - Alternative considered: keep launch wrapping in ACP transport. Rejected because dependency probes and ACP launch would continue to own separate platform behavior.
- Resolve Windows candidates in executable priority order.
  - Rationale: when a real executable is available, it avoids shell parsing and stdio proxying issues entirely. `.ps1` is next because modern npm installs commonly publish it beside `.cmd`.
  - Alternative considered: keep PATH directory order above suffix priority. Rejected because the same logical command often appears as multiple shim files in the same toolchain directory, and suffix priority is the intended platform rule here.
- Best-effort promote shims to `.exe` only when the executable exists.
  - Rationale: same-stem executables and shims that explicitly invoke a relative `.exe` can be launched directly without changing arguments.
  - Guardrail: npm `npx.ps1`/`npx.cmd` often invokes `node.exe` plus a CLI JavaScript file; launching only `node.exe` would lose required arguments, so this pattern is not promoted by the generic resolver.
- Keep suffix-appropriate launch wrappers for remaining shims.
  - Rationale: `.ps1` requires PowerShell `-File`; `.cmd` and `.bat` require `cmd.exe`.
- Keep direct launch for resolved `.exe` and non-Windows commands.
  - Rationale: direct execution preserves current behavior and avoids unnecessary shell parsing.

## Risks / Trade-offs

- Shim parsing is intentionally conservative -> some shims remain wrapped even if a deeper executable exists, but the resolver avoids unsafe partial rewrites.
- PowerShell unavailable or blocked by policy -> `.ps1` launch remains a platform diagnostic issue, not a per-launch fallback.
- Launch spec can become stale after users change PATH during the same Zotero process -> this matches the existing startup registry lifecycle contract.
- Existing tests may assert old suffix ordering -> update them to assert `.exe > .ps1 > .cmd > .bat` and verified shim promotion.
