# Design

## Manifest Contract

SkillRunner-compatible workflow manifests declare execution mode at skill level.

- `skillrunner.job.v1`: `request.create.mode` is required for declarative
  manifests and must be `auto` or `interactive`.
- `skillrunner.sequence.v1`: every declarative `request.sequence.steps[]` entry
  requires `mode` and must be `auto` or `interactive`.
- `execution.mode` and `execution.skillrunner_mode` are invalid fields.

Build-hook workflows do not need static mode declarations in the manifest, but
their returned requests must include either job `mode` or sequence step `mode`
so the runtime can normalize them before provider execution.

## Runtime Mapping

The workflow runtime maps manifest/request `mode` to backend
`runtime_options.execution_mode`.

- Single job requests: top-level request `mode` is consumed and removed before
  provider contract validation; the value becomes
  `runtime_options.execution_mode`.
- Sequence requests: each step `mode` is preserved in the sequence request and
  consumed while constructing the concrete step job request.
- Sequence step modes are independent. A workflow may run step 0 as
  `interactive` and step 1 as `auto`.

## UI and Diagnostics

UI/settings code derives the mode from the actual job or step request. Sequence
workflows with mixed step modes are displayed as mixed/empty summary state and
must not use workflow-level execution fields.
