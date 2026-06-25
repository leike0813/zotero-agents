## Why

Synthesis split skills currently pass cross-task files through cwd-sensitive
relative paths and manifest indirection. If an agent runs a generated script
from the skill package directory instead of the run workspace, the script can
write artifacts under the wrong root and still report plausible relative paths.
ACP Skills and SkillRunner both trust those result strings enough for the next
step to fail later.

## What Changes

- Treat `x-type` as the output file identity field. `artifact-manifest` is a
  first-class `x-type`; `x-role` remains a free business role string.
- Sync the plugin's SkillRunner output schema meta-schema and local annotation
  checks with the latest SkillRunner contract.
- Update generated synthesis skill output schemas to declare handoff manifests
  with `x-type: "artifact-manifest"`.
- Make synthesis runtime scripts generate absolute paths for cross-task state,
  handoff manifests, generated artifact manifests, and gate instructions.
- Remove cwd-sensitive synthesis command examples that encourage relative
  `--db` execution.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: output schema artifact manifest identity
  is discovered from `x-type: "artifact-manifest"`.
- `topic-synthesis-skills`: split synthesis skills emit absolute cross-task
  file paths and declare handoff manifests as artifact manifests.

## Impact

- Affects skill schema validation, artifact manifest discovery, generated
  synthesis skills, and focused tests.
- Does not modify the SkillRunner backend mirror under `reference/Skill-Runner`.
