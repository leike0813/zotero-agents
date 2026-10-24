# Authorized full-text surface review

Baseline: `a991d608188795e5123702179d608fc6c0e43e13`. Explicit deletion inventory: empty. Semantic review ran; context reviewRequired=true.

| Source | Existing semantics | Added owner | Result |
| --- | --- | --- | --- |
| CLI SKILL.md | All baseline instructions retained in order | Task grant, typed native handles, observations, waits, download idempotency, local ingress, canonical recovery and release | Aligned |
| Generic acquisition SKILL.md | All baseline candidate/review/write/result instructions retained | Finite institution-authorized acquisition, public-first routing, independent outcomes and current attachment evidence | Aligned |
| Hermes librarian SKILL.md | All resident notification, watched-run, attention, catalog, maintenance and scheduling instructions retained | Original active task owns login; resident reports distinct metadata/download/attachment outcomes | Aligned |
| CLI command contracts and renderer | Existing command cards retain their descriptors and operational contracts | Nine acquisition cards, opaque handle transitions, task authority and bounded recovery | Aligned |

The acquisition ingress exception is explicit beside file-delivery guidance, so the general export/download instruction does not direct an Agent to remotely fetch institutional bytes. WorkflowHostApi v12, navigation scope rules and independent write approvals remain unchanged.

Unmapped semantic count: 0. Downgraded semantic count: 0. Unauthorized dropped semantic count: 0. Intra-package duplicate count: 0. Existing source lines were compared against the baseline diff; additions were reviewed for layer ownership and receipt boundaries. The deterministic package gate found no errors or duplicate substantive prose.

Materialized gates used the unified content renderer under `.scaffold/test/authorized-fulltext-surface-review` and `inspectHostBridgeSkillPackages` with enforceMaterializedDepth, baselineRef and explicit current-to-baseline root maps. All three changed packages pass absolute depth and relative thickness (no substantive-line decline; normalized prose at least 95% of baseline). Hermes inherited CLI/acquisition bytes are identical to their reviewed source packages.

Agent Control Contract: aligned. Skill-package structure and reference reachability: aligned. Release identities and versions are unchanged; content synchronization is local implementation, with release/prebuild validation outside this change's publishing scope. Generated targets are synchronized only after this review handoff.

## Instruction-depth warnings

The 27 warnings below are accepted. Each is an existing generated command card for a bounded operation and includes its structured invocation/payload/result schema, effects, handles, completion and recovery. They exceed the hard floor; repeating instructions to reach the advisory length would add duplication. No acquisition card emits a depth warning.

- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/bridge/backend/list.md has 258 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/bridge/backend/status.md has 303 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/bridge/profile/diagnose.md has 242 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/bridge/profile/inspect.md has 242 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/bridge/status.md has 240 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/context/current.md has 319 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/debug/persistence.md has 345 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/debug/status.md has 300 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/debug/synthesis/clean-install-reset.md has 347 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/navigation/focus-zotero.md has 344 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/run/permission/get.md has 318 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/run/skill/connect.md has 318 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/run/skill/get.md has 318 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/surface/describe.md has 347 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/surface/identity.md has 284 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/synthesis/cache/invalidate.md has 349 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/synthesis/cache/status.md has 310 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/synthesis/evidence/search.md has 341 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/synthesis/graph/refresh-metrics.md has 348 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/synthesis/index/status.md has 242 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/agent-result/validate.md has 347 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/defaults.md has 296 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/list.md has 240 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/profile/describe.md has 299 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/profile/list.md has 242 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/profile/refresh.md has 299 lines; advisory depth is 350, so semantic review must accept or expand it
- addon/content/host-bridge-skills/zotero-bridge-cli: references/commands/workflow/queue/cancel.md has 328 lines; advisory depth is 350, so semantic review must accept or expand it

## Reproduction

- Render: `tsx scripts/host-bridge/render-host-bridge-surfaces.ts --content-only --output-root .scaffold/test/authorized-fulltext-surface-review`.
- Inspect: `inspectHostBridgeSkillPackages` for the CLI, Generic acquisition and Hermes librarian roots, with the pinned baseline and root mappings.
- After applying generated differences: `tsx scripts/host-bridge/render-host-bridge-surfaces.ts --content-only --check`.

No source commit, archive, release identity update, prebuild dispatch or publication is included.
