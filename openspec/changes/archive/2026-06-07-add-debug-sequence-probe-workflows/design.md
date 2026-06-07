# Design

The workflows live under `workflows_builtin/workflow-debug-probe` so the debug
workflow surface remains grouped. The probe skills remain under `skills_builtin`
because plugin skills and workflow packages are scanned by different runtime
registries.

Skill visibility is handled at registry time. `runner.json.debug_only: true`
marks a skill as debug-only. `scanPluginSkillRegistry()` omits those entries
unless `isDebugModeEnabled()` is true. This makes direct ACP execution and shared
catalog materialization fail closed in non-debug mode without adding a second
filter at every call site.

The probe workflows use `execution.skillrunner_mode = "auto"` because sequence
continuation intentionally does not resume deferred interactive steps yet.
