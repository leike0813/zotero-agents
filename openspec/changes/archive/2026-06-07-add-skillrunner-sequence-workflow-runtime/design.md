## Design

`skillrunner.sequence.v1` is a workflow-facing orchestration contract, not a
new remote SkillRunner REST API. In the first phase it resolves only on ACP
backends. The workflow runtime owns step order and handoff composition; ACP
still executes individual skill runs through `acp.skill.run.v1`.

Each sequence step produces its own ACP request id and task record. The
workflow run owns a separate `workflow_run_id`, which ACP uses to create or
reuse a shared workspace. Request identity and workspace identity therefore
stay separate.

Step handoff is intentionally narrow. Without a handoff declaration, the
previous step output is passed as `input.handoff`. With a declaration, the
runtime can select fields from an upstream output into step `input` or
`parameter`, optionally adding static defaults. The mapping does not execute
scripts or perform business transformations.

Deferred sequence continuation is not treated as a silent success. If a step
returns a deferred provider result, the current sequence stops closed instead
of launching downstream steps without a confirmed handoff. Persisted deferred
continuation can be added in a later change.
