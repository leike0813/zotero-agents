## Why

Workflows currently assume that `skillrunner.job.v1` skills live on the SkillRunner backend. To make ACP backends usable as SkillRunner-compatible workflow executors without creating a second workflow contract, the plugin needs its own skill asset registry and a formal compatibility contract.

This change locks the shared contract before implementing the ACP execution backend, so future work can align run-folder materialization, skill patching, prompt injection, and output handling with SkillRunner instead of inventing divergent behavior.

## What Changes

- Add plugin-side skill asset governance for `skills_builtin/` and `skills/`.
- Define source precedence: user skills override built-in skills; backend-installed skills remain the default execution target unless explicitly overridden.
- Introduce a plugin skill registry that scans skill directories, validates basic structure, reports diagnostics, and computes deterministic checksums.
- Preserve `skillrunner.job.v1` as the workflow-facing request contract for both SkillRunner REST and future ACP SkillRunner-compatible execution.
- Document the future compatibility contract for SkillRunner temporary skill upload and ACP task-session execution.
- Explicitly defer ACP backend execution, run-folder materialization, skill patching, prompt injection, and output-contract implementation to later changes.

## Capabilities

### New Capabilities

- `plugin-skill-registry`: Plugin-side discovery, validation, precedence, and checksum reporting for user and built-in skills.
- `acp-skillrunner-compatible-contract`: Contract that keeps ACP workflow execution compatible with `skillrunner.job.v1` while deferring backend execution implementation.

### Modified Capabilities

- `builtin-workflow-package-and-sync`: Build/package assets must include built-in plugin skills alongside built-in workflows.

## Impact

- Adds new plugin skill directories: `skills_builtin/` and `skills/`.
- Adds a registry module and tests for skill discovery and diagnostics.
- Updates packaging configuration so built-in skills are available in plugin builds.
- Adds SSOT documentation for plugin skill assets and ACP SkillRunner-compatible execution.
- Does not change existing workflow manifests, SkillRunner REST execution, ACP chat, MCP, or `applyResult()` behavior.
