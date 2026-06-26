# Plugin Skill Registry And ACP SkillRunner-Compatible SSOT

This document defines the governance model for plugin-side skill assets and ACP SkillRunner-compatible workflow execution.

## Core Contract

Workflows continue to emit `skillrunner.job.v1`. ACP compatibility is a provider/backend implementation detail, not a workflow authoring concern.

The plugin owns a shared skill registry that can discover plugin-side skills from:

- official content root: installed subscription skills under `content/official/skills`
- `skills/`: user skills

User skills override official skills when the same skill id exists in both roots. Dev-local skills sit between official and user sources; debug mode only controls whether debug-only entries are visible. SkillRunner backend-installed skills still execute by default unless a later explicit override policy requests plugin-side skill assets.

## Registry Scope

The registry is shared infrastructure. It discovers plugin-side skills and records diagnostics. It does not itself execute skills, patch `SKILL.md`, or create run workspaces.

## ACP-Compatible Runner Behavior

For ACP SkillRunner-compatible backends, the plugin consumes the same `skillrunner.job.v1` request and executes it through an isolated ACP task session and workspace. ACP chat continues to use `acp.prompt.v1`; chat launch behavior and backend profile command/args are not changed by workflow runs.

The runner resolves plugin-side skill assets, materializes them into run-local agent skill roots, injects a minimal SkillRunner-compatible run contract into the materialized `SKILL.md`, validates the runner-owned result JSON envelope recorded in `resultJsonPath`, and returns a normal `ProviderExecutionResult` for existing workflow `applyResult()` hooks. Business scripts should write package fallback files when needed; they must not hand-write the runner-owned result envelope.

ACP-compatible runs synthesize effective runtime options from these sources,
with later numbered sources overriding earlier numbered sources:

1. `runner.json.runtime.default_options`
2. request payload `runtime_options`
3. submit-time provider runtime options (`providerOptions`)

For `hard_timeout_seconds`, only positive integers are valid; if none of those
sources provides a valid value, the ACP compatibility layer falls back to
`1200` seconds. The synthesized effective options control local ACP execution
behavior but do not mutate the original submitted request payload.

`hard_timeout_seconds` is implemented as a local recoverable connection guard:
the timer starts at the ACP prompt-ready boundary, disconnects locally on
expiry, finalizes already-drained transcript content before appending the
timeout status item, and leaves the remote session recoverable. It must not mark
the run `failed` or `canceled`.

## Registry Entry

An effective plugin skill entry records:

- `skillId`
- `sourceKind`: `official`, `dev-local`, or `user`
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

At plugin startup, the shared platform layer resolves `uv`, Python, `node`, `npm`, and `npx` once and keeps the result in memory for the current Zotero lifecycle. If a skill declares `runtime.dependencies`, the ACP-compatible runner uses that startup result to choose a dependency strategy. When `uv` is available, the runner probes `uv run --isolated --with ... -- python --version`; on success, only that workflow run launches ACP through `uv run --with ... -- <backend command> <backend args>`. If `uv` is unavailable but Python is available, the runner verifies the declared dependencies are already available in that Python environment and then launches the configured backend unchanged. The runner must not silently execute in an environment missing declared dependencies; failures remain `runtime_dependencies_injection_failed` with diagnostics distinguishing uv dependency preparation failures from system Python missing-package failures.

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
