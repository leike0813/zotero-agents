# Move SkillRunner Mode To Skill Level

## Problem

`execution.mode` is a workflow-level field with no active runtime behavior, while
`execution.skillrunner_mode` controls actual SkillRunner/ACP-compatible skill
execution. Keeping the execution mode at workflow level makes sequence workflows
unable to express mixed step modes, such as an interactive first step followed by
an automatic second step.

## Goal

Move SkillRunner execution mode to the skill request that actually runs:

- single job workflows use `request.create.mode`
- sequence workflows use `request.sequence.steps[].mode`
- runtime maps those manifest fields to backend `runtime_options.execution_mode`

## Non-Goals

- Do not change SkillRunner or ACP backend wire protocols.
- Do not rename backend `runtime_options.execution_mode`.
- Do not change skill package `runner.json.execution_modes`.
- Do not keep compatibility fallback for old workflow-level mode fields.
