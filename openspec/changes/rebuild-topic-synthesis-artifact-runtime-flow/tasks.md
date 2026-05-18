# Tasks

- [x] Add OpenSpec delta specs for the renamed filtered artifact export tool and rebuilt topic synthesis runtime flow.
- [x] Update MCP protocol/service types to expose `synthesis.export_filtered_paper_artifacts` and remove the old public export tool.
- [x] Implement filtered artifact export manifest and content file writers in the Synthesis service.
- [x] Update create/update workflow required MCP tools.
- [x] Rework create/update skill runtime scripts for manifest-only artifact persistence, derived workset, filtered context assembly, and final artifact validation.
- [x] Add explicit paper-analysis schemas to both synthesis skill packages.
- [x] Update create/update SKILL, runner, and reference docs to clarify LLM-vs-script responsibility.
- [x] Update core tests for MCP tool surface, filtered export files, runtime flow, skill contracts, and final artifact validation.
- [x] Run `npm run test:node:core`, `npm run build`, and OpenSpec strict validation.
