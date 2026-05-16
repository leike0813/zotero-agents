# Design: Split ACP Skill Run Request From SkillRunner Job

## Decisions

- `skillrunner.job.v1` remains the workflow declaration and remote SkillRunner
  request format.
- `acp.skill.run.v1` is the only public provider request kind accepted by ACP
  skill execution.
- Workflow preparation adapts built `skillrunner.job.v1` requests to
  `acp.skill.run.v1` only after the backend has resolved to ACP.
- The adapter replaces each upload-derived `input[key]` value with the matching
  `upload_files[].path` absolute local path and removes `upload_files`.
- The ACP runner writes and prompts from the adapted request, not the remote
  SkillRunner request.

## Compatibility

Remote SkillRunner behavior and workflow manifests are unchanged. Existing
workflow authors can keep declaring `request.kind = "skillrunner.job.v1"` while
users choose either a SkillRunner or ACP backend in workflow settings.
