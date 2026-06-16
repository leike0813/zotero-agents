# Workflow Debug Probe

Debug-only builtin workflow that inspects workflow preflight state and opens a diagnostic panel.

This package also contains debug-only `skillrunner.sequence.v1` workflows for
manual validation of sequence orchestration:

- `debug-host-bridge-connectivity-probe`: Host Bridge CLI injection,
  endpoint reachability, authentication, and read-only capability routing.
- `debug-sequence-linear-probe`: serial execution and default handoff passthrough.
- `debug-sequence-workspace-reuse-probe`: workflow workspace reuse across steps.
- `debug-sequence-context-isolation-probe`: explicit handoff filtering and fresh
  workspace isolation.

The corresponding skills live under `skills_builtin/debug-*-probe*` and are
marked `debug_only` in their `runner.json` manifests.
