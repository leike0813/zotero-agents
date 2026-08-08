# Host Bridge semantic relocation baseline

- Baseline commit: `f6bdb17c89ef06478865d89c85725239dbeeb75d`
- Current generated root: `addon/content/host-bridge-skills`
- Baseline generated root: `skills_builtin`
- Validator mapping: `addon/content/host-bridge-skills=skills_builtin`
- Governed materialized files at baseline: 159
- Surface patch changes: none
- CLI build fingerprint changes: none
- External minimum-core, Generic, and Hermes payload byte changes: none

## Approved deletion inventory

The following generated directories may be removed only because their complete bytes move to the mapped addon root:

- `skills_builtin/zotero-bridge-cli`
- `skills_builtin/zotero-library-agent`
- `skills_builtin/zotero-library-query`
- `skills_builtin/zotero-literature-acquisition`
- `skills_builtin/zotero-literature-analysis`
- `skills_builtin/zotero-research-synthesis`
- `skills_builtin/zotero-library-curation`

No Skill instruction, semantic unit, directly linked reference, asset, runner contract, or source template is approved for deletion, compression, merger, reordering, or thinner rewriting.

## Required parity outcome

- `unmapped = 0`
- `downgraded = 0`
- `unauthorized dropped = 0`
- `intra-package duplicate = 0`

The baseline package gate reports the following 28 instruction-depth advisory warnings. Each disposition is `accepted: path relocation; content and operational domain unchanged`:

- `zotero-bridge-cli/references/commands/bridge/backend/list.md` — 258 lines
- `zotero-bridge-cli/references/commands/bridge/backend/status.md` — 303 lines
- `zotero-bridge-cli/references/commands/bridge/profile/diagnose.md` — 242 lines
- `zotero-bridge-cli/references/commands/bridge/profile/inspect.md` — 242 lines
- `zotero-bridge-cli/references/commands/bridge/status.md` — 240 lines
- `zotero-bridge-cli/references/commands/context/item/open.md` — 318 lines
- `zotero-bridge-cli/references/commands/context/note/open.md` — 318 lines
- `zotero-bridge-cli/references/commands/debug/acp-skill-run/reapply-result.md` — 347 lines
- `zotero-bridge-cli/references/commands/debug/persistence.md` — 345 lines
- `zotero-bridge-cli/references/commands/debug/status.md` — 300 lines
- `zotero-bridge-cli/references/commands/debug/synthesis/clean-install-reset.md` — 347 lines
- `zotero-bridge-cli/references/commands/mutation/preview.md` — 346 lines
- `zotero-bridge-cli/references/commands/run/permission/get.md` — 318 lines
- `zotero-bridge-cli/references/commands/run/skill/connect.md` — 318 lines
- `zotero-bridge-cli/references/commands/run/skill/get.md` — 318 lines
- `zotero-bridge-cli/references/commands/surface/describe.md` — 347 lines
- `zotero-bridge-cli/references/commands/surface/identity.md` — 284 lines
- `zotero-bridge-cli/references/commands/synthesis/cache/invalidate.md` — 349 lines
- `zotero-bridge-cli/references/commands/synthesis/cache/status.md` — 310 lines
- `zotero-bridge-cli/references/commands/synthesis/graph/refresh-metrics.md` — 348 lines
- `zotero-bridge-cli/references/commands/synthesis/index/status.md` — 242 lines
- `zotero-bridge-cli/references/commands/workflow/agent-result/validate.md` — 347 lines
- `zotero-bridge-cli/references/commands/workflow/defaults.md` — 296 lines
- `zotero-bridge-cli/references/commands/workflow/list.md` — 240 lines
- `zotero-bridge-cli/references/commands/workflow/profile/describe.md` — 299 lines
- `zotero-bridge-cli/references/commands/workflow/profile/list.md` — 242 lines
- `zotero-bridge-cli/references/commands/workflow/profile/refresh.md` — 299 lines
- `zotero-bridge-cli/references/commands/workflow/queue/cancel.md` — 328 lines

A warning may not disappear solely because the validator failed to follow the path mapping. The relocation-aware validator must reproduce this inventory under the mapped addon path.
