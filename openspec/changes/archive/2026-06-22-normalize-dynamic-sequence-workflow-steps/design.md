# Design

## Candidate Step Semantics

For a workflow with `request.kind = "skillrunner.sequence.v1"` and
`hooks.buildRequest`, `request.sequence.steps` represents the set of candidate
steps that `buildRequest` may emit. It is not the executable sequence plan.

The executable plan remains the `steps` array returned by `buildRequest`.

## Conditional Metadata

Candidate steps may include `include_if` metadata:

- `{ "kind": "parameter", "parameter": "<name>", "equals": <value> }`
- `{ "kind": "runtime", "condition": "<stable-condition-id>" }`

`parameter` conditions describe workflow-parameter branches. `runtime`
conditions name hook/runtime-derived branches that are not expressible as a
parameter comparison.

The runtime does not evaluate `include_if` in this change. The field exists for
manifest readability, validation, future UI projection, and documentation.

## Validation

Static sequence workflows keep existing validation: declared steps and
`result.final_step_id` are required.

Hook-driven sequence workflows remain valid without `request.sequence.steps`.
When they do declare candidate steps, the loader validates:

- step ids are non-empty and unique;
- a declared `result.final_step_id`, if present, matches one candidate step;
- handoff bindings that name a source step refer to one candidate step;
- short-circuit declarations keep their existing shape.

The final step may still be dynamic for hook-driven workflows; therefore
`result.final_step_id` is not required for those workflows.
