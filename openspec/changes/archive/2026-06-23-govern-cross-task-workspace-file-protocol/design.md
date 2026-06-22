## Design

The plugin aligns with the current SkillRunner output schema contract:
`x-type` is the machine-readable identity field and supports `file`,
`artifact`, and `artifact-manifest`. `x-role` is required for artifact outputs
but remains a free string; code must not infer manifest identity from it.

Synthesis runtime scripts become the source of path truth. They resolve the
run root from `--db`, validate generated paths against that root, and write
absolute paths into gate instructions, handoff outputs, handoff manifests,
paper artifact manifests, and final artifact manifests. SkillRunner backend
normalization is responsible for converting those paths for bundle output.

Generated `SKILL.md` instructions stop presenting relative `runtime/...`
commands as the execution model. Agents are instructed to run from the provided
workspace and copy gate-returned absolute commands/paths.

## Boundaries

- Do not edit `reference/Skill-Runner`; it is a read-only protocol mirror.
- Do not add SkillRunner backend normalization in this repository.
- Do not migrate every third-party/user skill. Update source/builtin skills in
  this repository where their output schema still declares manifests with the
  old `x-type: "artifact"` identity.
