# Host Bridge semantic review

Baseline: `c4dd65c24a5a6df726a000ccc58ff4cfaf6600c4`. Authorized deletion inventory: empty.

Minimum-core owns destination/approval command mechanics; Generic acquisition owns destination proposal and live verification. Hermes inherits both without a new policy owner. Existing instructions remain in place. Generated schema/example changes follow the canonical schema and CLI contract; get-operation schema formatting and workflow-catalog description drift are generated equivalents, not deleted instructions.

| Materialized file | Baseline lines | Current lines | Baseline prose characters | Current prose characters |
| --- | ---: | ---: | ---: | ---: |
| addon/content/host-bridge-skills/zotero-bridge-cli/SKILL.md | 190 | 192 | 38453 | 39797 |
| addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/mutation/get-operation.md | 23 | 23 | 2098 | 2098 |
| addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md | 23 | 23 | 2163 | 2163 |
| addon/content/host-bridge-skills/zotero-library-agent/references/workflow-catalog.md | 339 | 339 | 31114 | 31059 |
| addon/content/host-bridge-skills/zotero-literature-acquisition/SKILL.md | 106 | 107 | 9557 | 10284 |
| profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/SKILL.md | 190 | 192 | 38453 | 39797 |
| profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/mutation/get-operation.md | 23 | 23 | 2098 | 2098 |
| profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md | 23 | 23 | 2163 | 2163 |
| profiles/hermes/zotero-librarian/skills/zotero-library-agent/references/workflow-catalog.md | 339 | 339 | 31114 | 31059 |
| profiles/hermes/zotero-librarian/skills/zotero-literature-acquisition/SKILL.md | 106 | 107 | 9557 | 10284 |

Unmapped: 0. Downgraded: 0. Unauthorized dropped: 0. Intra-package duplicate: 0.

Existing advisory-depth command cards remain accepted: their generated cards contain complete invocation, payload/result schemas, approval, handle/effect boundaries and recovery. Hard and relative package gates pass; no source reference is removed. Content render and consumer checks pass. Release/prebuild identities are intentionally not published in this local implementation; the embedded CLI contract requires a newly built binary.
