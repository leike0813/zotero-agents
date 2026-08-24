## Why

The declarative request compiler and the sequence runtime each carry a private
copy of the SkillRunner upload path projection: sanitize the file key, take the
local path basename, and produce the uploads-root relative `inputs/<key>/<file>`
wire path. Two owners for one wire contract can diverge between single-job and
sequence requests.

## What Changes

- Add one provider-side `buildSkillRunnerUploadRelativePath(fileKey, localPath)` module under `src/providers/skillrunner`.
- Keep the sanitization and normalization helpers private inside that module.
- Migrate the declarative `skillrunner.job.v1` compiler and the sequence runtime upload mapping to the shared builder.
- Preserve the exact fallback and sanitization behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-runtime`: Require one shared SkillRunner upload path projection for single-job and sequence requests.

## Impact

- `src/providers/skillrunner/uploadMapping.ts` plus two request-builder call sites.
- New contract test file for the shared projection.
- `doc/components/workflows.md` and workflow-execution-runtime OpenSpec.
- No provider protocol, request schema, or persistence changes.
