# Change: Switch Topic Synthesis Workflows to Split Sequence

## Why

The new topic synthesis split skill suite now has real gated runtime paths for
create prepare, core enrichment, and finalize. The builtin create/update topic
synthesis workflows still target the legacy monolithic skills through
`skillrunner.job.v1`, so users cannot exercise the new ordered protocol from
the workflow entry points.

The update prepare package also has a declared `stage_10_update_topic_context`
payload stage, but the runtime dispatch path has not implemented that stage
yet. Switching the update workflow before filling this gap would fail during
the first update payload submit.

## What Changes

- Convert `create-topic-synthesis` and `update-topic-synthesis` builtin
  workflows to `skillrunner.sequence.v1`.
- Use the new split skills in order:
  prepare -> `topic-synthesis-core-enrichment` -> `topic-synthesis-finalize`.
- Reuse the workflow workspace for downstream sequence steps.
- Remove the update workflow's legacy `buildRequest` hook dependency; update
  topic context is collected by `update-topic-synthesis-prepare` Stage 10.
- Implement the minimum update prepare runtime support for
  `stage_10_update_topic_context`, including normalized update operation and
  stored topic/update metadata.
- Regenerate the split skill packages from `skills_src/topic-synthesis`.

## Impact

- Existing workflow entry points now launch the split skill sequence.
- Legacy monolithic skill packages remain in the repository for compatibility
  and reference, but they are no longer the default create/update workflow
  targets.
- The shared apply hook still receives only the final step result.
- Full update diff/patch semantics remain a follow-up concern; this change only
  makes the split update path pass through prepare and carry update metadata.

