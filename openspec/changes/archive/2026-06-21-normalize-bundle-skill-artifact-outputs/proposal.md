# Normalize Bundle Skill Artifact Outputs

## Why

Bundle-producing skills currently mix business results, runtime diagnostics, and artifact file paths in their final output. This makes SkillRunner bundle assembly brittle: downstream consumers must guess which paths matter, while agents are tempted to hand-write long path lists.

## What Changes

- Define a flat artifact manifest contract for bundle skills.
- Mark artifact manifest fields in output schemas with `x-type: "artifact"` and `x-role: "artifact-manifest"`.
- Normalize `literature-deep-reading` final output to expose only the final HTML artifact plus a flat artifact manifest.
- Normalize topic synthesis finalize output to expose only the business result and a flat artifact manifest.
- Teach topic synthesis apply to resolve required legacy artifact paths from the new flat manifest while preserving compatibility with existing outputs.

## Impact

- SkillRunner backends can bundle all required files by reading output-schema artifact roles.
- ACP runner behavior remains local-path based and does not rewrite artifact fields.
- Existing topic synthesis results that still provide `resolver_manifest_path` and `analysis_manifest_path` continue to apply.
