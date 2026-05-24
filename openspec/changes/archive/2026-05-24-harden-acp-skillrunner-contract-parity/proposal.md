## Why

ACP Skills currently only partially mirrors Skill Runner's contract handling. This caused valid package-level output schema requirements, such as `assets/output.schema.json`, to be ignored during ACP final output validation and skipped output repair.

## What Changes

- Add a shared ACP schema resolver aligned with Skill Runner's declared-path plus default-path fallback rules.
- Validate ACP skill input, parameter, and output payloads through the resolved schemas.
- Render Skill Runner entrypoint prompts in ACP Skills, including engine-specific and common prompts.
- Recover valid package-generated result JSON files before failing or repairing invalid assistant text.
- Harden plugin-side skill package validation for runner shape, identity, schema files, and schema annotations.
- Preserve documented ACP divergences: passive output repair only, no run-scoped target schema, no artifact path normalization, no Skill Runner attempt model, and no engine config/runtime option emulation.

## Capabilities

### New Capabilities

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: ACP Skills contract handling for schema resolution, prompt rendering, request validation, output validation, and result-file fallback.
- `plugin-skill-registry`: Registry validation for Skill Runner-compatible package shape and schema annotations.

## Impact

- Affected runtime modules: ACP skill output validation/convergence, prompt building, request execution orchestration, and plugin skill registry scanning.
- Affected tests: ACP SkillRunner-compatible runner, ACP request adapter, plugin skill registry, and workflow contract regression tests.
- No new external dependencies are required.

