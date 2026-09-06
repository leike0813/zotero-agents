# Issue #39 Change 3 semantic surface review

Reviewed and materialized on 2026-09-06. This record covers the local Change 3
source, generated content, and review-mirror work. It does not authorize or
represent a Host Bridge release.

## Scope and evidence

- Fixed semantic baseline: `a60879d6e669b148fcf22d1d16433045c7080f54`.
- Cumulative semantic baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`.
- Approved deletion inventory: DEL-03, DEL-04, DEL-08, and DEL-14.
- Direct semantic sources: `skills_src/zotero-bridge-cli/SKILL.md` and
  `skills_src/zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md`.
- Rendered ownership is defined by `host-bridge/surfaces.json`: minimum-core
  owns `zotero-bridge-cli`; Generic inherits it and owns the six research
  Skills; Hermes inherits both and owns its root and Librarian materials.

The source additions are additive relative to the fixed baseline: six lines in
the minimum-core Skill and two lines in acquisition. They add no new semantic
owner and do not compress an existing instruction.

## Semantic result

### Canonical mutation contract

`mutation.execute` and `mutation.preview` each expose the closed union of 23
canonical operations. Both require non-empty canonical `--input`; preview is a
write-intent review path and is available for every operation in that union.
`mutation get-operation` is independently discoverable from generic `operation
get`. Its observation output is exactly `running`, `settled(result)`, or
`unavailable`; it exposes neither request payloads nor timestamps.

The rendered Skill keeps one operation ID for one complete mutation intent,
requires renewed approval after a changed `domainPlanDigest`, and directs the
caller to durable evidence and a live post-read before proposing another
change. It preserves the 30-day ordinary terminal-evidence retention and the
identity binding left after expiration. It does not expose public token or
revision authority.

### D3 acquisition

The acquisition source states that bibliographic item creation or reuse and
explicit collection membership are required core work. Curated metadata on a
reused item is preserved. PDF and landing-page enrichment remain optional. If
required collection membership fails, rollback is limited to the objects and
membership created by this invocation; it never deletes a reused item or an
already-existing membership. The outcome is failed or compensated, while
residual and uncertain effects go to repair or reconciliation.

### Deletion audit

| Inventory entry | Result |
| --- | --- |
| DEL-03 | Legacy mutation transport was not restored. |
| DEL-04 | Removed legacy operation names were not restored; the canonical union closes at 23 operations. |
| DEL-08 | No public expected-revision or token authority returned. `relatedRefs` is a request field; per-result `relatedRef` is not the deleted singular request alias. |
| DEL-14 | No public `src/handlers` DSL, copied shim, or runtime handler injection returned. |

## Layer and parity results

| Layer | Result | Evidence |
| --- | --- | --- |
| Minimum-core / `zotero-bridge-cli` | aligned | Source, executable contract, generated command catalog, and rendered cards agree on the 23-operation mutation surface and `mutation get-operation`. |
| Generic / acquisition | aligned | D3 required-core, rollback, reused-state protection, optional enrichment, and residual classification are explicit in its owned source and rendered Skill. |
| Hermes | aligned by inheritance | No direct source owner changes were required; inherited minimum-core and Generic semantics remain represented through the surface manifest. |
| Skill packages | aligned | All materialized package hard floors and fixed-baseline relative-thickness checks passed. |
| Agent Control Contract | aligned | Approval, observation, evidence, opaque identity, and recovery boundaries are present without restored deleted authority. |

| Measure | Count |
| --- | ---: |
| Unmapped semantic units | 0 |
| Downgraded semantic units | 0 |
| Unauthorized dropped semantic units | 0 |
| Intra-package duplicate semantic units | 0 |

## Rendered surfaces and review mirror

After the settled CLI contract changes, the governed renderer refreshed the
affected mutation cards, the Agent Surface JSON, and the minimum-core manifest.
The final governed render and `npm run check:host-bridge-content`, rerun on
2026-09-06 after the final contract settle, both returned `changes: []`; the
agent-language and consumer-guidance checks passed. No generated surface was
hand-edited.

The official review-mirror workflow was rerun after that render with `prepare`,
`finalize`, and `npm run check:host-bridge-review-mirror`. The final refreeze
was generated at `2026-09-06T07:38:56.966Z` and passed with 153 owned Markdown
files: minimum-core has 134 owned and 134 effective files; Generic has 13 owned
and 147 effective files; Hermes has 6 owned and 153 effective files. The 12
affected mutation cards were retranslated from the current source while their
fenced schemas, examples, inline machine values, and current 169
specialization were kept verbatim. The `collection create` review card includes
the `placement: { kind: root }` example. The mirror checker verifies frozen
inputs, exact file coverage, protected Markdown structure, source and
translation hashes, ownership, and provenance.

## Thickness and advisory disposition

The materialized package gate passed against the fixed baseline. It emitted 27
minimum-core command-card advisories. There were no Generic, acquisition, or
Hermes-owned advisories.

All warned cards exceed the 200-line hard floor, retain their generated command
contract sections, and show no relative-baseline regression. They are outside
the Change 3 additions and are accepted for this review; no instruction was
mechanically expanded merely to reach the advisory 350-line threshold.

## Local verification

- Final 2026-09-06 `npm run render:host-bridge-content` and immediate
  `npm run check:host-bridge-content` — both returned `changes: []`.
- `npm run check:host-bridge-content` — passed.
- `npx tsx scripts/check-host-bridge-agent-language.ts` — passed.
- `npx tsx scripts/check-host-bridge-skill-packages.ts --baseline-ref a60879d6e669b148fcf22d1d16433045c7080f54 ...` across the resolved minimum-core, Generic, acquisition, and Hermes Skill roots — passed with 27 accepted advisories.
- `npx tsx scripts/host-bridge-review-mirror.ts prepare`, `finalize`, and `npm run check:host-bridge-review-mirror` — passed; final mirror provenance is dated `2026-09-06T07:38:56.966Z`.
- `npm run check:zotero-bridge-cli-governance -- --json` — confirms the
  computed fingerprint recorded below and the separate release-identity state.

## Separate release metadata state

`npm run check:zotero-bridge-cli-governance -- --json` reports changed CLI
fingerprint inputs while `cli/zotero-bridge/release.json` remains at version
`0.5.5` with manifest fingerprint
`2ef15640bcf10945895ab4a1daa65e89337d6f99978316278c8aa4b1ecb4b4c1`;
the current computed fingerprint is
`9862ceb0dc4a45e85870dec43fc9b132e3d78fe8591d994f056a8833a70920c5`.

Per guide sections 14.4 and 16, this is a release-set/prebuild metadata state,
not a local Change 3 source, render, review, sync, or archive blocker. No
release identity, binary manifest, prebuild evidence, receipt, publication, or
release metadata was fabricated or changed here. It must be completed during
the separately authorized release-set stage.

semantic review ran: yes
context reviewRequired: true
baseline commit: `a60879d6e669b148fcf22d1d16433045c7080f54`; cumulative `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`
semantic source edits: `skills_src/zotero-bridge-cli/SKILL.md`; `skills_src/zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md`
minimum-core result: aligned
Generic result: aligned
Hermes result: aligned
Skill-package result: aligned
semantic parity result: aligned
unmapped semantic count: 0
downgraded semantic count: 0
unauthorized dropped semantic count: 0
intra-package duplicate count: 0
reference-depth result: aligned with accepted advisories
instruction-depth warnings: 27 minimum-core cards accepted; no Generic, acquisition, or Hermes-owned warning
Agent Control Contract result: aligned
release identity result: blocked outside this change's local task scope
alignment result: aligned
next commands: task 6.1 and task 6.2 may be marked complete from this local evidence without editing this record's task files; continue Change 3 implementation verification and official OpenSpec sync/archive; perform release identity and prebuild only at the separate release-set stage
