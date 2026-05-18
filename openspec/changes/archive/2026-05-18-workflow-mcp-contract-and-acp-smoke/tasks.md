# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `workflow-mcp-contract-and-acp-smoke`.
- [x] Add proposal, design, tasks, and delta specs.

## 2. Workflow Contract

- [x] Add `execution.supportedBackends` and `execution.mcp.requiredTools` to
  workflow types and schema.
- [x] Filter backend resolution with `supportedBackends`.
- [x] Add ACP-only required MCP declarations to create/update topic synthesis
  workflows.

## 3. ACP Callable Smoke

- [x] Resolve workflow-declared required MCP tools into ACP skill run requests.
- [x] Prefer workflow MCP tools over runner-level compatibility declarations.
- [x] Run callable smoke before initial business prompt for required-MCP runs.
- [x] Run callable smoke before recovered continuation prompts.
- [x] Inject the MCP guard prompt after smoke succeeds.

## 4. Skill Instructions

- [x] Remove MCP environment-discovery/preflight instructions from create/update
  topic synthesis `SKILL.md`.
- [x] Remove runner prompt text that asks agents to verify MCP injection.

## 5. Verification

- [x] Run workflow contract tests.
- [x] Run ACP SkillRunner-compatible runner tests.
- [x] Run synthesize topic workflow contract tests.
- [x] Run `npm run build`.
- [x] Run `openspec validate workflow-mcp-contract-and-acp-smoke --strict`.
