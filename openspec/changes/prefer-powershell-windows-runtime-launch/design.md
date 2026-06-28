## Context

Runtime command discovery is already centralized in the platform layer and cached at startup. ACP transport still contains Windows-specific launch interpretation for resolved `.cmd` and `.bat` shims, using `cmd.exe /d /c` at the point of each ACP launch. Field testing shows this wrapper can fail for Zotero-hosted ACP stdio sessions when the workspace path contains non-ASCII characters, while PowerShell wrapping succeeds.

## Goals / Non-Goals

**Goals:**

- Make the platform command layer own both command resolution and launch wrapping.
- Cache the resolved launch shape during startup preflight for known runtime commands.
- Use PowerShell by default for Windows `.cmd` and `.bat` shims.
- Reuse the same launch shape for ACP backend launch and dependency probes.

**Non-Goals:**

- Do not add per-launch retry from PowerShell to `cmd.exe`.
- Do not change command resolution priority.
- Do not install npm packages or repair user PATH/nvm configuration.

## Decisions

- Add a launch specification to `RuntimeCommandResolution`.
  - Rationale: the startup registry is the lifecycle-scoped source of truth, and launch wrappers should not be recomputed by business modules.
  - Alternative considered: keep launch wrapping in ACP transport. Rejected because dependency probes and ACP launch would continue to own separate platform behavior.
- Use PowerShell script invocation for `.cmd` and `.bat`.
  - Rationale: explicit `& '<resolved.cmd>' '<arg>'` invocation handles spaces and avoids `cmd.exe` parsing failures seen with non-ASCII workspaces.
  - Alternative considered: preserve `cmd.exe /d /c` as default. Rejected because it is the observed failure path.
- Keep direct launch for `.exe` and non-Windows commands.
  - Rationale: direct execution preserves current behavior and avoids unnecessary shell parsing.

## Risks / Trade-offs

- PowerShell unavailable or blocked by policy -> use deterministic PowerShell candidates and `-ExecutionPolicy Bypass`; missing shell remains a platform diagnostic issue, not a per-launch fallback.
- Launch spec can become stale after users change PATH during the same Zotero process -> this matches the existing startup registry lifecycle contract.
- Existing tests may assert `cmd.exe` details -> update them to assert observable launch mode and quoting instead of the old wrapper.
