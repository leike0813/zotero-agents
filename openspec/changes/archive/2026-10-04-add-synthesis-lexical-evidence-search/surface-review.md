# Surface review

Fixed baseline: `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`. Approved semantic deletion inventory: **empty**. Existing instructions must retain their owners, wording and order; additions describe the evidence operation only.

| Materialized path | Baseline substantive lines / chars | Before-edit lines / chars | After-render lines / chars |
| --- | ---: | ---: | ---: |
| `profiles/hermes/zotero-librarian/skills/zotero-research-synthesis/SKILL.md` | 121 / 14792 | 121 / 14792 | 123 / 16191 |
| `profiles/hermes/zotero-librarian/skills/zotero-research-synthesis/references/playbook.md` | 166 / 11895 | 166 / 11895 | 166 / 11895 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/references/playbook.md` | 166 / 11895 | 166 / 11895 | 166 / 11895 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/SKILL.md` | 121 / 14792 | 121 / 14792 | 123 / 16191 |
| `profiles/hermes/zotero-librarian/skills/zotero-library-agent/SKILL.md` | 93 / 11232 | 93 / 11232 | 93 / 11232 |
| `profiles/hermes/zotero-librarian/skills/zotero-library-agent/references/workflow-catalog.md` | 339 / 31114 | 339 / 31114 | 339 / 31114 |
| `profiles/hermes/zotero-librarian/skills/zotero-library-agent/references/research-task-model.md` | 214 / 17195 | 214 / 17195 | 214 / 17195 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md` | 113 / 13989 | 113 / 13989 | 113 / 13989 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/SKILL.md` | 190 / 38453 | 190 / 38453 | 190 / 38453 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/command-catalog.md` | 146 / 13403 | 146 / 13403 | 147 / 13795 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md` | 237 / 15940 | 237 / 15940 | 237 / 15940 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/resident-operations.md` | 234 / 13972 | 234 / 13972 | 234 / 13972 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/automation-policy.md` | 232 / 14280 | 232 / 14280 | 232 / 14280 |
| `addon/content/host-bridge-skills/zotero-bridge-cli/SKILL.md` | 190 / 38453 | 190 / 38453 | 190 / 38453 |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/command-catalog.md` | 146 / 13403 | 146 / 13403 | 147 / 13795 |
| `addon/content/host-bridge-skills/zotero-library-agent/references/workflow-catalog.md` | 339 / 31114 | 339 / 31114 | 339 / 31114 |
| `addon/content/host-bridge-skills/zotero-library-agent/references/research-task-model.md` | 214 / 17195 | 214 / 17195 | 214 / 17195 |
| `addon/content/host-bridge-skills/zotero-library-agent/SKILL.md` | 93 / 11232 | 93 / 11232 | 93 / 11232 |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/synthesis/evidence/search.md` | Absent | Absent | 24 / 2158 (341 materialized lines) |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/synthesis/evidence/search.md` | Absent | Absent | 24 / 2158 (341 materialized lines) |

The line/character pairs above use the checker’s substantive-instruction metric. The 93 and 166 values are metric counts, not absolute depth floors. The materialized hard floors are 100 lines for a `SKILL.md` and 200 lines for a reference; all packages passed those floors. The 341-line evidence command card is above the reference hard floor and below the 350-line advisory threshold.

## Fan-out ownership

Broker owns Library source identity, eligibility, scope, file/content versions and verified reads. Reverse-Host transports those facts; the Rust application owns matching, ranking, passage segmentation, request bounds and cursors. Workflow, typed client, Bridge, MCP and CLI are explicit projections. Built-in workflows do not acquire the new capability implicitly. CLI guidance owns command facts, Generic research-synthesis owns evidence interpretation, Hermes inherits the Generic policy. No resident authority or release identity changes.

## Verification

### Source semantic review

Reviewed the CLI minimum-core source and Generic research-synthesis source additions. The CLI command-catalog addition is limited to operational facts: discover the live command descriptor, pass a JSON request container through `--query`, target `synthesis.search_evidence`, and observe its current result/continuation contract. It does not prescribe library-scope interpretation or explain what missing/completed-empty evidence means. Generic research-synthesis owns scope interpretation, evidence evaluation, omissions and absence semantics. Hermes inherits that policy; it adds no competing interpretation. The CLI's exact argument and result branches remain discoverable from its live schema. `reviewRequired: true`.

No pre-existing instruction was edited, reordered or removed. The approved deletion inventory remains empty. The additions preserve the baseline instruction set and its ordering.

| Affected package | Unmapped | Downgraded | Unauthorized dropped | Intra-package duplicates |
| --- | ---: | ---: | ---: | ---: |
| Minimum-core `zotero-bridge-cli` | 0 | 0 | 0 | 0 |
| Generic `zotero-research-synthesis` | 0 | 0 | 0 | 0 |
| Hermes hosted `zotero-librarian` (including inherited CLI and Generic roots) | 0 | 0 | 0 | 0 |

### Gate warnings and disposition

Both the addon doc-sync roots and the Hermes inherited roots reported 27 command-reference depth advisories in their respective CLI packages. Accept all warnings. The new `synthesis/evidence/search.md` card is 341 materialized lines, above the 200-line hard floor; it exposes the full generated command contract fields, including input/output schemas, bounds, approval/effect, continuation and recovery facts. The other 26 warned cards are generated from complete command schemas and likewise retain their schema-derived contract fields; their advisory counts range from 240 to 349 lines and each exceeds the hard floor. No warning is silently suppressed or treated as a semantic parity substitute.

The CLI release identity in `releases/host-bridge/cli-release.json` is unchanged and aligned. The Agent Control Contract and runtime-derived Agent Surface descriptor are aligned with the command contract. Generic owns evidence interpretation; minimum-core owns command facts; Hermes inherits the Generic policy without taking over task semantics.

### Render and validation

- Render completed (as reported by the coordinating agent). Independent `npm run check:host-bridge-content` passed: renderer check returned `changes: []`, Agent language check passed, and Host Bridge consumer guidance aligned.
- `npm run check:host-bridge-doc-sync -- --baseline-ref 84b3028dba8f5f3b8437f3aa237bf0fec2e68820` — passed for all seven addon package roots and `profiles/hermes/zotero-librarian/skills/zotero-librarian`.
- `npx tsx scripts/host-bridge/check-host-bridge-skill-packages.ts --baseline-ref 84b3028dba8f5f3b8437f3aa237bf0fec2e68820 profiles/hermes/zotero-librarian/skills/{zotero-bridge-cli,zotero-library-agent,zotero-library-query,zotero-literature-acquisition,zotero-literature-analysis,zotero-research-synthesis,zotero-library-curation,zotero-librarian}` — passed for all Hermes inherited roots and the hosted skill.
- Rust CLI crate tests — 146 passed across unit and schema-mode tests, including canonical schema ref resolution and pre-dispatch validation.
- Host Bridge surface tests — 15 passed; canonical schema references compile through configured Ajv without a command-specific exception.
- Evidence projection tests — 6 passed, including Bridge/MCP discovery and execution.

Semantic review is complete and aligned. No source, generator, or render file was edited as part of this final record update.
