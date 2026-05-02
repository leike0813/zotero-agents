# Plugin Skill Registry And ACP SkillRunner-Compatible SSOT

This document defines the governance model for plugin-side skill assets and ACP SkillRunner-compatible workflow execution.

## Core Contract

Workflows continue to emit `skillrunner.job.v1`. ACP compatibility is a provider/backend implementation detail, not a workflow authoring concern.

The plugin owns a shared skill registry that can discover plugin-side skills from:

- `skills_builtin/`: packaged built-in skills
- `skills/`: user skills

User skills override built-in skills when the same skill id exists in both roots. SkillRunner backend-installed skills still execute by default unless a later explicit override policy requests plugin-side skill assets.

## Registry Scope

The registry is shared infrastructure. It discovers plugin-side skills and records diagnostics. It does not itself execute skills, patch `SKILL.md`, or create run workspaces.

## ACP-Compatible Runner Behavior

For ACP SkillRunner-compatible backends, the plugin consumes the same `skillrunner.job.v1` request and executes it through an isolated ACP task session and workspace. ACP chat continues to use `acp.prompt.v1`; chat launch behavior and backend profile command/args are not changed by workflow runs.

The runner resolves plugin-side skill assets, materializes them into run-local agent skill roots, injects a minimal SkillRunner-compatible run contract into the materialized `SKILL.md`, validates `result/result.json`, and returns a normal `ProviderExecutionResult` for existing workflow `applyResult()` hooks.

v1 supports auto execution only. Interactive workflow reply loops are explicitly out of scope.

## Registry Entry

An effective plugin skill entry records:

- `skillId`
- `sourceKind`: `user` or `builtin`
- `sourceDir`
- `skillMdPath`
- `runnerJsonPath`
- `checksum`
- `diagnostics`

A skill is valid for the registry only when it has both `SKILL.md` and `assets/runner.json`.

## Future SkillRunner REST Behavior

For SkillRunner REST backends, future execution should:

1. Query backend skill catalog.
2. Use the backend-installed skill when present.
3. Use plugin-side skill assets through SkillRunner temporary skill upload only when the backend lacks the skill or an explicit override requests plugin assets.

## ACP Agent Skill Roots

ACP agents use different local skill discovery roots. The compatibility layer resolves an `AcpAgentFamily` from explicit backend override, backend id/displayName, command/args, then fallback.

Default run-local roots:

- `codex`: `.agents/skills`, `.codex/skills`
- `claude-code`: `.claude/skills`
- `opencode`: `.agents/skills`, `.claude/skills`
- `gemini-cli`: `.agents/skills`, `.gemini/skills`
- `qwen-code`: `.qwen/skills`
- `unknown`: `.agents/skills`

Backend profiles may declare `acp.agentFamily` or `acp.skillRoots` to override inference. Overrides only affect ACP SkillRunner-compatible workflow runs.

## Runtime Dependency Injection

If a skill declares `runtime.dependencies`, the ACP-compatible runner probes `uv run --with ... -- python -c ...`. On success, only that workflow run launches ACP through `uv run --with ... -- <backend command> <backend args>`. On failure, the run fails with `runtime_dependencies_injection_failed`; the runner must not silently execute in an environment missing declared dependencies.

File-flow optimizations are allowed inside the compatibility layer. ACP execution may pass local file paths via an internal manifest and may read result directories directly through an internal bundle reader, but it must not change the workflow-facing `upload_files`, `input`, `parameter`, or `fetch_type` fields.

## SkillRunner Alignment Anchors

Future ACP materialization must reference:

- `reference/Skill-Runner/server/services/orchestration/run_skill_materialization_service.py`
- `reference/Skill-Runner/server/services/skill/skill_patcher.py`
- `reference/Skill-Runner/docs/output_contract_prompt_injection_ssot.md`
- `reference/Skill-Runner/server/assets/templates/run_execution_instructions.md.j2`
- `reference/Skill-Runner/server/services/orchestration/run_bundle_service.py`

Any deliberate deviation from SkillRunner behavior must be documented as a compatibility-layer difference.

## Maintenance Rules

Update this SSOT when:

- plugin skill root rules change
- registry validation rules change
- SkillRunner temporary upload behavior is implemented
- ACP SkillRunner-compatible execution is implemented
- `skillrunner.job.v1` compatibility assumptions change
- ACP agent skill roots or uv dependency injection rules change
