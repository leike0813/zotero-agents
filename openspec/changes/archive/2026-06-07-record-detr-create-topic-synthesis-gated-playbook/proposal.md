# Record DETR Create Topic Synthesis Gated Playbook

## Why

The previous DETR create topic synthesis playbook was produced before the
split-skill runtime could run end to end. It is schema-valid documentation, but
it is not a gate-truth baseline because the runtime-owned files were not all
created by the generated split-skill gates.

The new split runtime can now create SQLite receipts, Host Bridge resolver
cascade artifacts, handoffs, sidecars, sections, and the final candidate. We
need a real DETR create run captured as a durable fixture so later tests can
detect schema drift, gate ordering regressions, and Host Bridge contract drift.

## What Changes

- Add a new gated DETR playbook artifact under
  `artifact/topic-synthesis-create-detr-gated-playbook/`.
- Run the generated split skills in a Host Bridge legal ACP run workspace under
  `runtimePersistence.acpSkillRunsDir`, then mirror it into the artifact at
  `workspace/runtime/acp/skill-runs/acp-skill-detr-create-topic-synthesis/`.
- Use real read-only `zotero-bridge` commands for diagnostics, duplicate
  checks, library index probing, resolver selection, and the runtime resolver
  cascade.
- Limit the formal gated run to five selected DETR-related papers by using an
  explicit resolver payload derived from the live resolver result.
- Replace the old playbook test baseline with assertions over the new gated
  run artifact.

## References

- Superseded dry-run baseline:
  `openspec/changes/record-detr-create-topic-synthesis-playbook/`
- Split runtime contract:
  `openspec/changes/complete-topic-synthesis-split-skill-runtime/`
- Operational split-skill instructions:
  `openspec/changes/operationalize-topic-synthesis-split-skill-instructions/`
- Split skill source of truth:
  `skills_src/topic-synthesis/contracts/`
- New gated baseline:
  `artifact/topic-synthesis-create-detr-gated-playbook/playbook.md`

## Impact

- Adds artifact, documentation, schema examples, and focused tests only.
- Does not write back to Zotero.
- Does not register the new split-skill packages as workflow defaults.
- Does not start a development server or add dependencies.
