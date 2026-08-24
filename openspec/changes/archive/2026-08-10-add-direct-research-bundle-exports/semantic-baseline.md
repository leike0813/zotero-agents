# Host Bridge semantic baseline

- Baseline commit: `63d57ff2ecf33601248ef7f7085f67d24ee5ae16`
- Recorded before semantic-source edits: yes
- Explicit deletion inventory: empty
- Existing unrelated worktree change excluded from this change: `addon/content/help-docs/manifest.json`

## Affected materialized file metrics

| Materialized file | Substantive instruction lines | Normalized prose characters |
| --- | ---: | ---: |
| `addon/content/host-bridge-skills/zotero-library-agent/SKILL.md` | 90 | 10018 |
| `addon/content/host-bridge-skills/zotero-library-agent/references/research-task-model.md` | 211 | 15527 |
| `addon/content/host-bridge-skills/zotero-library-query/SKILL.md` | 100 | 8848 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/SKILL.md` | 112 | 10334 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/references/playbook.md` | 162 | 10257 |

The two generated Minimum command cards do not exist at the baseline and therefore have no relative per-file metric. Existing Minimum catalog and Skill files remain preservation-required and are covered by the baseline package gate.

## Required completion counts

- Unmapped semantic units: `0`
- Downgraded semantic units: `0`
- Unauthorized dropped semantic units: `0`
- Intra-package duplicates: `0`

## Final semantic review

The review compared the additive Generic coordinator, Query, and Synthesis guidance with the generated Minimum command contracts and the inherited Hermes surface. Hermes requires no facet-owned override because the Generic branch, completion evidence, and recovery semantics apply unchanged through inheritance.

| Materialized file | Final substantive instruction lines | Final normalized prose characters |
| --- | ---: | ---: |
| `addon/content/host-bridge-skills/zotero-library-agent/SKILL.md` | 92 | 10953 |
| `addon/content/host-bridge-skills/zotero-library-agent/references/research-task-model.md` | 213 | 16693 |
| `addon/content/host-bridge-skills/zotero-library-query/SKILL.md` | 102 | 9516 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/SKILL.md` | 116 | 12027 |
| `addon/content/host-bridge-skills/zotero-research-synthesis/references/playbook.md` | 166 | 11899 |

- Unmapped semantic units: `0`
- Downgraded semantic units: `0`
- Unauthorized dropped semantic units: `0`
- Intra-package duplicates: `0`
- Fixed-baseline package depth gate: passed; existing advisory-depth warnings remain limited to pre-existing Minimum command cards.
- Chinese ownership mirror: 150 owned files finalized and provenance/structure check passed.
- Aggregate consumer-guidance check: still reports the baseline-owned `test/core/172-export-research-bundle-skill-runtime.test.ts` handwritten `.zotero-bridge` state marker. This change does not edit that file or weaken the consumer rule.
