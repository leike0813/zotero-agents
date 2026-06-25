## Overview

The UI projection layer owns the final secondary label because both banner subtitles and drawer task rows are normalized in `assistant-panel-model.js`.

## Decisions

- Single workflow secondary label: `skillName -> skillId -> requestId`.
- Sequence workflow secondary label: `<step> <skill>/<workflow>`.
- Step index is rendered as 1-based keycap emoji for steps 1-9 and `#<n>` beyond that range.
- Sequence detection uses `role === "sequence_step"`, `sequenceStepId`, `sequenceStepIndex`, or nested `sequence.stepIndex`.
- ACP Chat is excluded because its drawer rows represent conversations, not skill runs.

## Data Flow

- SkillRunner projections already carry sequence and workflow metadata.
- ACP Skills run records gain `sequenceStepIndex?: number` and include it in summaries.
- `runSeam` passes sequence step id/index into ACP skill run updates when sequence progress events create or update ACP skill runs.
- `assistant-panel-model.js` builds one shared secondary label and uses it for both banner subtitles and task-card `workflowLabel`.
