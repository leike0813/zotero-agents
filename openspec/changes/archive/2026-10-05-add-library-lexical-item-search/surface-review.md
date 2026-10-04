# C3 Host Bridge surface review

## Pre-edit baseline record

- Task-specified fixed surface baseline commit: `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`. This is the deletion and thickness floor for the review.
- Pre-implementation HEAD: `5fb5aa54`. Every path below is measured at `git show 84b3028d:<path>`, at `git show 5fb5aa54:<path>`, and in the current working tree, so the fixed floor and the real pre-edit state of this change are both visible rather than one standing in for the other.
- Surface resolution: `zotero-bridge-cli` materializes under `addon/content/host-bridge-skills/zotero-bridge-cli` and `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli`; `zotero-library-agent` extends that surface and materializes the query Skill under `addon/content/host-bridge-skills/zotero-library-query` and `profiles/hermes/zotero-librarian/skills/zotero-library-query`; the inherited catalog is rendered to `docs/host-bridge-cli.md`.
- Authorized explicit deletion inventory: none. No existing instruction may be removed, compressed, merged, reordered, or rewritten thinner.
- Metrics use the package checker's normalization: substantive instruction lines exclude frontmatter, headings, blank lines, tables, comments, and fenced blocks; normalized prose characters strip link targets and punctuation.

Pre-edit metrics recorded at `84b3028d` before any C3 edit (retained verbatim):

| Materialized file | Substantive instruction lines | Normalized prose characters |
| --- | ---: | ---: |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/command-catalog.md` | 146 | 13,403 |
| `addon/content/host-bridge-skills/zotero-library-query/SKILL.md` | 102 | 9,511 |
| `addon/content/host-bridge-skills/zotero-library-query/references/playbook.md` | 138 | 10,732 |

## Affected manifest-resolved materialized paths

Every path below changed in this change, by hand for the three semantic sources and by `render:host-bridge-content` for the rest.

| Path | Kind | Owner |
| --- | --- | --- |
| `skills_src/zotero-bridge-cli/references/command-catalog.md` | semantic Markdown | hand-written minimum-core guidance around the generated entry marker |
| `skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md` | semantic Markdown | hand-written generic query Skill |
| `skills_src/zotero-library-agent/skills/zotero-library-query/references/playbook.md` | semantic Markdown | hand-written query playbook |
| `docs/host-bridge-cli.md` | semantic Markdown | inherited rendered catalog |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/command-catalog.md` | semantic Markdown | materialized minimum-core catalog |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/library/item/search.md` | semantic Markdown | materialized CLI command card |
| `addon/content/host-bridge-skills/zotero-library-query/SKILL.md` | semantic Markdown | materialized generic query Skill |
| `addon/content/host-bridge-skills/zotero-library-query/references/playbook.md` | semantic Markdown | materialized query playbook |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/command-catalog.md` | semantic Markdown | Hermes materialized catalog |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/library/item/search.md` | semantic Markdown | Hermes materialized command card |
| `profiles/hermes/zotero-librarian/skills/zotero-library-query/SKILL.md` | semantic Markdown | Hermes materialized generic query Skill |
| `profiles/hermes/zotero-librarian/skills/zotero-library-query/references/playbook.md` | semantic Markdown | Hermes materialized query playbook |
| `addon/content/host-bridge-skills/manifest.json` | rendered data JSON | rendered package identity and digests |
| `addon/content/host-bridge-skills/zotero-bridge-cli/assets/agent-surface.json` | rendered data JSON | materialized surface descriptor |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/assets/agent-surface.json` | rendered data JSON | Hermes materialized surface descriptor |

## Metrics

Three measurement points are reported for every affected path: the task-specified fixed surface baseline `84b3028d`, the actual pre-implementation state `5fb5aa54`, and the current state after this change. The fixed baseline is the contract floor; the pre-implementation column shows what C1 and C2 had already moved before C3 started.

### Semantic Markdown paths

This is the complete Markdown set for the change: the 3 authoring sources and all 9 manifest-resolved materialized Markdown files across the three surfaces, grouped by surface. The `docs/components/*.md` files edited by the Broker and registry owners in this change are hand-written component documentation outside the materialized surface set and are not part of this review.

Each cell is `lines / substantive instruction lines / normalized prose characters`.

| Surface | Path | Fixed baseline `84b3028d` | Pre-implementation `5fb5aa54` | After | Prose % vs fixed | Prose % vs pre |
| --- | --- | --- | --- | --- | ---: | ---: |
| minimum-core source | `skills_src/zotero-bridge-cli/references/command-catalog.md` | 79 / 47 / 5,924 | 83 / 48 / 6,316 | 91 / 51 / 7,861 | 132.70% | 124.46% |
| minimum-core materialized | `addon/content/host-bridge-skills/zotero-bridge-cli/references/command-catalog.md` | 409 / 146 / 13,403 | 414 / 147 / 13,795 | 422 / 150 / 15,340 | 114.45% | 111.20% |
| minimum-core materialized (Hermes) | `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/command-catalog.md` | 409 / 146 / 13,403 | 414 / 147 / 13,795 | 422 / 150 / 15,340 | 114.45% | 111.20% |
| minimum-core card | `addon/content/host-bridge-skills/zotero-bridge-cli/references/commands/library/item/search.md` | 478 / 24 / 2,216 | 478 / 24 / 2,216 | 1,077 / 24 / 2,306 | 104.06% | 104.06% |
| minimum-core card (Hermes) | `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/commands/library/item/search.md` | 478 / 24 / 2,216 | 478 / 24 / 2,216 | 1,077 / 24 / 2,306 | 104.06% | 104.06% |
| inherited catalog | `docs/host-bridge-cli.md` | 2,581 / 645 / 23,010 | 2,583 / 645 / 23,012 | 2,583 / 645 / 23,072 | 100.27% | 100.26% |
| generic source | `skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md` | 206 / 102 / 9,511 | 206 / 102 / 9,511 | 210 / 104 / 10,677 | 112.26% | 112.26% |
| generic materialized | `addon/content/host-bridge-skills/zotero-library-query/SKILL.md` | 206 / 102 / 9,511 | 206 / 102 / 9,511 | 210 / 104 / 10,677 | 112.26% | 112.26% |
| generic materialized (Hermes) | `profiles/hermes/zotero-librarian/skills/zotero-library-query/SKILL.md` | 206 / 102 / 9,511 | 206 / 102 / 9,511 | 210 / 104 / 10,677 | 112.26% | 112.26% |
| generic source | `skills_src/zotero-library-agent/skills/zotero-library-query/references/playbook.md` | 354 / 138 / 10,732 | 354 / 138 / 10,732 | 366 / 143 / 13,104 | 122.10% | 122.10% |
| generic materialized | `addon/content/host-bridge-skills/zotero-library-query/references/playbook.md` | 354 / 138 / 10,732 | 354 / 138 / 10,732 | 366 / 143 / 13,104 | 122.10% | 122.10% |
| generic materialized (Hermes) | `profiles/hermes/zotero-librarian/skills/zotero-library-query/references/playbook.md` | 354 / 138 / 10,732 | 354 / 138 / 10,732 | 366 / 143 / 13,104 | 122.10% | 122.10% |

Every affected Markdown path holds both floors against the fixed baseline: substantive instruction lines never drop below `84b3028d`, and the lowest normalized prose ratio is 100.27%, above the 95% floor. Per surface over the fixed baseline, the minimum-core catalog gains 4 substantive lines and 1,937 prose characters, the query Skill gains 2 substantive lines and 1,166 prose characters, the playbook gains 5 substantive lines and 2,372 prose characters, and each Hermes copy tracks its content counterpart exactly. The command card's line growth from 478 to 1,077 is fenced schema payload from the canonical `$ref` request and the shared result envelope, not prose; its substantive count is unchanged at 24. The `84b3028d` column reproduces the raw pre-edit record above for the three originally enumerated files (146 / 13,403, 102 / 9,511, 138 / 10,732), which confirms the fixed baseline and the raw measurement agree.

### Rendered data JSON

`manifest.json` and `assets/agent-surface.json` are generated package digests and machine descriptors, not agent-facing instruction text. They carry no instruction lines, so substantive-line and normalized-prose metrics are not defined for them and no such pseudo-count is reported; only byte size is tracked, and their integrity is owned by the renderer checksum gate rather than by prose thickness.

| Path | Fixed baseline `84b3028d` | Pre-implementation `5fb5aa54` | After |
| --- | ---: | ---: | ---: |
| `addon/content/host-bridge-skills/manifest.json` | 33,773 bytes | 33,975 bytes | 33,975 bytes |
| `addon/content/host-bridge-skills/zotero-bridge-cli/assets/agent-surface.json` | 2,122,058 bytes | 2,126,296 bytes | 2,137,818 bytes |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/assets/agent-surface.json` | 2,122,058 bytes | 2,126,296 bytes | 2,137,818 bytes |

## Review result

- Semantic source edits: `skills_src/zotero-bridge-cli/references/command-catalog.md`; `skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md`; `skills_src/zotero-library-agent/skills/zotero-library-query/references/playbook.md`.
- Minimum-core result: aligned. The hand-written discovery section sits outside the generated entry marker, so `renderCommandCatalog` replaces only the marker and leaves it intact; the generated command table and card come from `contracts/host-bridge/cli-commands.v2.json`.
- Generic result: aligned. Query routing, bounds, and the search-versus-list decision are in the query Skill; the playbook carries the scope, coverage, continuation, and recovery procedure.
- Hermes result: affected, not unaffected. The profile re-materializes the same three sources, so the profile query Skill, playbook, CLI catalog, and command card carry the same additions.
- Explicit deletion inventory: none. Every baseline prose line of the three semantic sources survives; the single changed line in `zotero-library-query/SKILL.md` keeps its original sentence verbatim and appends one clause to the reference description.
- Generated semantic-owner mapping on `references/commands/library/item/search.md`: three generated lines changed owner value, and none was dropped. The example and prerequisite line moved from a legacy `text`-era shape to the canonical bounded request; `Output boundary` moved from `limit` / `data.items` / `data.truncated` to `cursor` / `data.results` with `data.nextCursor`, `data.hasMore`, and `data.total`; `Pagination` moved from `none` to `cursor`. These lines render from the CLI contract's `examples` and `outputBoundary`, and the removed `data.items` and `data.truncated` fields no longer exist in the canonical result schema, so a generated equivalent replaces them instead of any instruction being deleted. Substantive line count on the card is unchanged at 24.
- Semantic parity counts: unmapped 0, downgraded 0, unauthorized dropped 0.
- Intra-package duplicate count: 0; the deterministic materialized-package gate reports none.
- Instruction-depth warnings: 54 advisory warnings, all pre-existing and all on command cards this change does not touch, spread evenly over the two `zotero-bridge-cli` roots at 27 each, ranging 240 to 349 lines against an advisory depth of 350. None of the affected paths appears in the warning list. Disposition: accepted; they are outside this change's write set and outside its semantic scope.
- Renderer robustness: `capabilityInputFields` and `capabilityInputSummary` now read the effective contract through `resolveHostBridgeCanonicalSchema` in `scripts/host-bridge/host-bridge-command-contracts.ts`, which inlines canonical protocol `$ref`s and walks combinator branches. The `library.search_items` documentation gate therefore still requires `query` and forbids `text` on the effective schema instead of on an inline `properties` object.
- Agent Control Contract alignment: aligned with the C2 `EvidenceSearchRequest` and `SearchResultBase` schema references. CLI validation resolves the canonical shared request schema, including UTF-16 query bounds and effective page limits; output validation accepts the complete shared search envelope with no list wrapper.
- Release identity alignment: no release identity or receipt file was created or modified. `addon/content/host-bridge-skills/manifest.json` changes are limited to the rendered `commandCatalogChecksum`, byte counts, and digests.

## Verification

- `cargo test --locked --manifest-path rust/zotero-bridge/Cargo.toml`: 134 unit tests and 17 `schema_mode` tests passed, 0 failed.
- `npx tsx node_modules/mocha/bin/mocha tests/host-bridge/168-host-bridge-release-coordinator.test.ts tests/host-bridge/169-host-bridge-agent-surface.test.ts tests/host-bridge/170-host-bridge-surface-manifest.test.ts --timeout 120000`: 43 passing.
- `npm run render:host-bridge-content` rendered the content and profile roots; `npm run check:host-bridge-content` then reported no changes, no agent-language violations, and aligned consumer guidance.
- `npx tsx scripts/host-bridge/check-host-bridge-skill-packages.ts --baseline-ref 84b3028dba8f5f3b8437f3aa237bf0fec2e68820` over the four affected roots: exit 0 with the 54 advisory warnings recorded above.

## Integrated verification

- Task 5.4 passed on real Linux Zotero 10.0.2: the core integration suite completed with 20 passing cases, including registered capability/MCP Library search through a real Broker and the plugin's published current-source sidecar.
- Task 5.5 passed its focused domain and Rust checks. The serial unified Zotero E2E exited 0 with Run Manifest `ba2cbd22-8098-4f31-a33c-db419159ce6d` marked `complete`; all 18 recorded cases passed. The final task state and verification limits are recorded in `tasks.md`.
