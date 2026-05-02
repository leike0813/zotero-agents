## Context

The current workflow runtime uses `skillrunner.job.v1` as the fixed request contract for SkillRunner-backed skills. SkillRunner itself owns installed skill assets, temporary skill upload, run-local skill materialization, runtime `SKILL.md` patching, output schema prompt injection, and run bundle/result handling.

The plugin now needs a path for ACP backends to execute the same workflow skills without forcing workflow authors to declare a separate ACP-specific request type. That requires a plugin-side skill registry and an explicit compatibility boundary before any ACP backend implementation.

## Goals / Non-Goals

**Goals:**

- Make plugin-side skills discoverable from `skills_builtin/` and `skills/`.
- Keep workflow-facing requests on `skillrunner.job.v1`.
- Define a compatibility contract shared by future SkillRunner REST temporary upload and ACP SkillRunner-compatible execution.
- Record SkillRunner reference anchors that future run-folder materialization must match.

**Non-Goals:**

- Implement ACP workflow execution.
- Implement run-local skill copy, patching, prompt injection, or output schema materialization.
- Implement SkillRunner temporary skill upload.
- Change existing workflow manifests, provider settings, or `applyResult()` contracts.

## Decisions

1. **Keep `skillrunner.job.v1` as the only workflow-facing skill run request.**

   ACP compatibility is a provider/backend concern. Adding `acp.skill.run.v1` would make workflow authors understand two execution contracts and increase governance burden.

2. **Add a plugin skill registry as shared infrastructure.**

   The registry is not owned by ACP or SkillRunner providers. It resolves plugin-side assets and returns normalized metadata that future providers can consume.

3. **Use source precedence only for plugin-side conflicts.**

   User skills override built-in skills when both exist in the plugin registry. Backend-installed skills still execute by default for SkillRunner REST unless a future override option explicitly requests plugin assets.

4. **Defer run-folder behavior until it can be matched against SkillRunner.**

   SkillRunner has dedicated behavior for run-local snapshots, patch modules, output contracts, and bundle candidates. ACP execution must reference:

   - `reference/Skill-Runner/server/services/orchestration/run_skill_materialization_service.py`
   - `reference/Skill-Runner/server/services/skill/skill_patcher.py`
   - `reference/Skill-Runner/docs/output_contract_prompt_injection_ssot.md`
   - `reference/Skill-Runner/server/assets/templates/run_execution_instructions.md.j2`
   - `reference/Skill-Runner/server/services/orchestration/run_bundle_service.py`

5. **Allow ACP file-flow optimizations only inside the compatibility layer.**

   Future ACP execution may pass local file paths through a manifest and may read output directories directly, but it must not change `upload_files`, `input`, `fetch_type`, or other public `skillrunner.job.v1` fields.

## Risks / Trade-offs

- Plugin and backend skill versions may diverge. Mitigation: record checksums and source kind in registry diagnostics and runtime logs.
- Built-in skills must be packaged explicitly. Mitigation: include `skills_builtin/**/*.*` in build assets and add tests around registry path behavior.
- ACP execution may drift from SkillRunner semantics if implemented too early. Mitigation: first change locks the contract and reference anchors but defers materialization/prompt logic.
- User skill directories may contain invalid assets. Mitigation: registry returns diagnostics and excludes invalid entries instead of throwing for the whole scan.

## Migration Plan

No workflow migration is required. Existing workflows and SkillRunner REST execution continue to use the same manifests and request payloads.

After this change, future implementation can introduce temporary SkillRunner upload and ACP-compatible execution behind the existing provider/backend selection model.
