# Semantic and implementation baseline

- Implementation baseline: `bcca43902fd5509f49e0dcc8a3cdfbd3aebb440d`
- Fixed semantic release baseline: `de4bcf12a3589776f79c985d13a8500b1eea59ce`
- Latest completed release set at planning time: `hbrs-f9f28ddce98be3008e13bbdb`
- Explicit agent-instruction deletion inventory: empty
- Authorized infrastructure deletion inventory:
  - `schemas/host-bridge-cli-command-contracts.v1.json`
  - `schemas/host-bridge-cli-command-contracts.v1.schema.json`
  - `schemas/host-bridge-cli-output-boundaries.v1.json`
  - `schemas/host-bridge-cli-output-boundaries.v1.schema.json`
  - `cli/zotero-bridge/src/agent-surface.json`
  - duplicated capability, effect, approval, target, binding, and output-boundary maps after their facts are represented in the executable contracts

## Materialized baseline metrics

| Materialized file | Lines | Characters |
| --- | ---: | ---: |
| `skills_builtin/zotero-bridge-cli/SKILL.md` | 245 | 29,292 |
| `skills_builtin/zotero-bridge-cli/references/commands/library/item/search.md` | 427 | 10,203 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/SKILL.md` | 245 | 29,292 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/library/item/search.md` | 427 | 10,203 |

The baseline package gate passed all hard depth and relative-thickness checks. It reported 39 pre-existing command-card advisory warnings below 350 lines. Each warning is accepted provisionally because every card remains above the 200-line hard floor, represents one complete generated leaf-command contract, and is outside this change unless its underlying executable contract changes. The final review must re-run the gate and account for every warning.

## Preservation rule

No existing semantic instruction may be compressed, deleted, merged, reordered, or rewritten more thinly. Generated facts may change only where the executable parser or contract changes. New parameter-error guidance must match the operational depth of adjacent invocation, evidence, failure, and recovery guidance.
