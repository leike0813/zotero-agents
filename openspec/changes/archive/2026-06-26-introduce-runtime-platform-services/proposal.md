# Introduce Runtime Platform Services

## Summary

The plugin currently resolves paths, PATH variables, command executables, and
subprocess fallbacks in multiple feature modules. Windows behavior works today
and must remain the compatibility baseline, but Linux runtime and Node test
paths expose drift: ACP backends can fail to find `npx`, Windows absolute paths
can be treated as repository-relative paths, and test fixtures can silently
change semantics based on the host OS.

## Goals

- Add a single platform services layer for runtime platform detection, native
  path handling, PATH/env merging, command resolution, and subprocess execution.
- Preserve current Windows command and path behavior as a protected contract.
- Fix Linux/macOS command resolution for ACP, Host Bridge CLI, SkillRunner ctl,
  and Git/uv-related runtime probes.
- Remove duplicated platform branches from business modules after equivalent
  platform services exist.
- Make Node Zotero mock path behavior explicit so Windows fixtures remain stable
  when tests run on Linux.

## Non-Goals

- Do not change ACP, SkillRunner, Host Bridge, or workflow wire protocols.
- Do not delete user/runtime data or untracked `C:/` and `D:/` directories in
  this change.
- Do not change workflow business semantics or skill output schemas.
