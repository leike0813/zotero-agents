# Host Bridge Semantic Review

semantic review ran: yes
context reviewRequired: true
baseline commit: `4dbddc24e884921262c559428bf851db5eadf2d7`
semantic source edits: `skills_src/zotero-bridge-cli/SKILL.md`; `skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md`; `skills_src/zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md`; `profiles_src/hermes/zotero-librarian/README.md`; `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md`; `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/resident-operations.md`; `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md`
minimum-core result: aligned
Generic result: aligned
Hermes result: aligned
Skill-package result: aligned
semantic parity result: aligned
unmapped semantic count: 0
downgraded semantic count: 0
unauthorized dropped semantic count: 0
intra-package duplicate count: 0
reference-depth result: aligned
instruction-depth warnings: 28 accepted warnings; each materialized command card remains above the 200-line hard floor, is generated from an unchanged exact command descriptor, did not regress against the fixed baseline, and is outside the snapshot semantic domain. Accepted individually: `bridge/backend/list` (258), `bridge/backend/status` (303), `bridge/profile/diagnose` (242), `bridge/profile/inspect` (242), `bridge/status` (240), `context/item/open` (318), `context/note/open` (318), `debug/acp-skill-run/reapply-result` (347), `debug/persistence` (345), `debug/status` (300), `debug/synthesis/clean-install-reset` (347), `mutation/preview` (346), `run/permission/get` (318), `run/skill/connect` (318), `run/skill/get` (318), `surface/describe` (347), `surface/identity` (284), `synthesis/cache/invalidate` (349), `synthesis/cache/status` (310), `synthesis/graph/refresh-metrics` (348), `synthesis/index/status` (242), `workflow/agent-result/validate` (347), `workflow/defaults` (296), `workflow/list` (240), `workflow/profile/describe` (299), `workflow/profile/list` (242), `workflow/profile/refresh` (299), and `workflow/queue/cancel` (328).
agent control contract result: aligned
release identity result: aligned; CLI version `0.5.5`, source fingerprint input changes are expected, no prebuild or release identity was advanced
alignment result: edits applied
next commands: `npm run render:host-bridge-content`; rerun the baseline-pinned Skill-package gate; prepare and finalize the Chinese review mirror; run `npm run check:host-bridge-content` and `npm run check:host-bridge-doc-sync`

## Review rationale

The minimum-core addition owns the exact fixed-basis snapshot command facts: first-page and continuation inputs, bounded batch size, process-local lifetime, terminal evidence, and restart behavior. It does not introduce research-task or resident-service policy.

Generic guidance only states the coordinator's evidence boundary: a completed snapshot proves the captured basis, while incomplete traversal cannot prove absence or replace live facts. It does not duplicate CLI invocation details.

Hermes remains the single resident state owner. It stages one generation, promotes only after exact completion evidence, preserves the prior generation on interruption or terminal failure, and treats a completed empty snapshot as authoritative. The resident-operation and state references retain their original operational domains while documenting the generation model at matching depth.

The approved deletion inventory is empty. Baseline meanings remain in their original owners; current-state wording that replaces the old in-place index description preserves and strengthens its atomicity, evidence, failure, and recovery semantics. No generated target was edited during this review.
