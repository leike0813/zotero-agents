# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `stabilize-acp-mcp-preflight-and-tool-surface`.
- [x] Add proposal, design, tasks, and delta specs.

## 2. ACP Preflight

- [x] Add `mcp.required_tools` support to ACP skill runner execution.
- [x] Fail required-MCP skill runs before first prompt when HTTP MCP is
  unavailable, MCP startup fails, or required tools are missing.
- [x] Add ACP runner tests for preflight failure and preflight pass-through.

## 3. MCP Tool Surface

- [x] Remove public `synthesis.read_paper_artifacts` from MCP `tools/list` and
  direct `tools/call`.
- [x] Keep `readPaperArtifacts` internal for manifest/export implementation.
- [x] Update MCP tests for disabled read tool and export-only artifact path.

## 4. Skill Instructions

- [x] Add required MCP declarations to create/update topic synthesis
  `runner.json`.
- [x] Update create/update `SKILL.md` and runner prompts so MCP preflight is
  before any runtime DB initialization.
- [x] Remove public-tool references to `synthesis.read_paper_artifacts`.

## 5. Verification

- [x] Run focused MCP and ACP runner tests.
- [x] Run topic synthesis runtime contract tests.
- [x] Run `npm run build`.
- [x] Run `openspec validate stabilize-acp-mcp-preflight-and-tool-surface --strict`.
