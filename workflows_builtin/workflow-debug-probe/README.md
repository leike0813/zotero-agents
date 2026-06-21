# Workflow Debug Probe

Debug-only builtin workflow that inspects workflow preflight state and opens a diagnostic panel.

This package also contains debug-only `skillrunner.sequence.v1` workflows for
manual validation of sequence orchestration:

- `debug-host-bridge-connectivity-probe`: Host Bridge CLI injection,
  endpoint reachability, authentication, and read-only capability routing.
- `debug-host-bridge-connectivity-sequence-probe`: the same Host Bridge
  connectivity checks through the SkillRunner sequence orchestration path.
- `debug-sequence-linear-probe`: serial execution and explicit value handoff.
- `debug-sequence-workspace-reuse-probe`: workflow workspace reuse across steps.
- `debug-sequence-file-handoff-probe`: provider-neutral file handoff from one
  step result into the next step file input.
- `debug-sequence-context-isolation-probe`: explicit handoff filtering and fresh
  workspace isolation.

The corresponding skills live under `skills_builtin/debug-*-probe*` and are
marked `debug_only` in their `runner.json` manifests.
