## Why

The plugin currently delegates SkillRunner jobs by sending only `skill_id`, which assumes the backend has an already installed and version-aligned skill. This breaks the plugin-side skill package model where `skills/` and `skills_builtin/` are the source of truth and can differ from backend-installed skills.

## What Changes

- Make `skillrunner.job.v1` execute local plugin-side skill packages by default.
- Package the resolved local skill directory into a temporary skill zip and upload it with the run.
- Use the current Skill-Runner backend implementation route: create `/v1/jobs` with `skill_source: "temp_upload"`, then upload `skill_package` and optional input `file` to `/v1/jobs/{request_id}/upload`.
- Preserve an explicit `installed` compatibility route for workflows that still intentionally target backend-installed skills.
- Extend workflow manifest authoring so `request.create.skill_source` can select `"local-package"` or `"installed"`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-adapter`: SkillRunner provider execution now defaults to local package temp-upload runs while preserving installed-skill compatibility.
- `workflow-manifest-authoring-schema`: SkillRunner workflow manifests can declare the SkillRunner skill source route.

## Impact

- Affected provider code: SkillRunner client transport, provider request contract validation, and local skill package bundling.
- Affected workflow code: declarative request compilation, workflow manifest TypeScript types, and standalone workflow schema.
- Affected data flow: `request.create.skill_id` remains the local skill lookup key; the backend does not receive `skill_id` on temp-upload create requests.
- No dependency installation or backend schema migration is required.
