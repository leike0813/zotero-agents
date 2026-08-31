# Host Bridge semantic baseline

- Baseline commit: `4dbddc24e884921262c559428bf851db5eadf2d7`
- Recorded before semantic-source edits: yes
- Semantic review context schema: `host-bridge.semantic-review-context.v1`
- Affected surfaces resolved from `host-bridge/surfaces.json`: minimum-core `zotero-bridge-cli`, Generic `zotero-library-agent`, and Hermes `zotero-librarian`
- Explicit semantic deletion inventory: empty
- Authorized instruction deletion, compression, merger, reordering, or downgrade: none

The context collector reported `reviewRequired: true`. Its unclassified baseline-to-HEAD files are `package.json`, `scripts/host-bridge-semantic-review-context.ts`, and `scripts/host-bridge-workflow-catalog.ts`; they predate this change's implementation edits and do not authorize semantic deletion.

## Affected materialized file metrics

Metrics use `scripts/check-host-bridge-skill-packages.ts` definitions: frontmatter, fenced code, comments, headings, and table-only lines are excluded from substantive instruction lines; normalized prose removes Markdown punctuation and whitespace.

| Materialized file | Substantive instruction lines | Normalized prose characters |
| --- | ---: | ---: |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/library/snapshot.md` | 24 | 2286 |
| `addon/content/host-bridge-skills/zotero-library-agent/SKILL.md` | 92 | 10942 |
| `addon/content/host-bridge-skills/zotero-library-agent/references/research-task-model.md` | 213 | 16688 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md` | 111 | 13030 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/resident-operations.md` | 230 | 12875 |
| `profiles/hermes/zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md` | 227 | 14530 |

The baseline-relative package gate passes. It reports 28 pre-existing minimum-core command-card advisory depth warnings; none concerns `library/snapshot.md`, every warned card remains above the hard floor and reachable from the canonical catalog, and the warnings do not authorize thinning. Final review must either retain this unchanged disposition or expand the affected card.

## Required final return contract

- Unmapped semantic units: `0`
- Downgraded semantic units: `0`
- Unauthorized dropped semantic units: `0`
- Intra-package duplicates: `0`
- All three affected surfaces aligned: required
- Review blocker: none
