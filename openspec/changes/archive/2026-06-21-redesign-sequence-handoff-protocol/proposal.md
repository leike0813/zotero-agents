# Redesign Sequence Handoff Protocol

## Why

Sequence workflow handoff currently copies string paths from one step result into the next step request. That makes file handoff depend on provider-specific behavior: SkillRunner expects `upload_files`, while ACP expects native local file paths and validates them before execution.

This mismatch caused ACP sequence handoff to fail even when the referenced file existed, because the handoff protocol did not declare that the value was a file artifact requiring provider-specific materialization.

## What Changes

- Replace legacy `from_step/input/parameter/pass_through/defaults` handoff with typed `bindings`.
- Represent handoff as provider-neutral logical data flow.
- Support `value` and `file` bindings.
- Materialize `file` bindings at provider dispatch time:
  - ACP receives native absolute local paths.
  - SkillRunner receives upload-relative input paths. Local frontend files still
    use `upload_files`; files produced inside a reused SkillRunner workspace use
    workspace file binding metadata so the backend materializes them
    server-side.
- Migrate builtin sequence workflows to the new protocol.

## Impact

- Existing sequence workflow manifests using the old handoff shape are no longer compatible.
- ACP keeps its existing request protocol. SkillRunner gains an explicit
  workspace file binding extension under `runtime_options.workspace` for
  reused-workspace handoff.
- Skills do not need to change their own input/output contracts to participate in sequence handoff.
