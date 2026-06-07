# Record DETR Create Topic Synthesis Playbook

> Superseded: this change produced a schema-valid dry-run artifact before the
> split-skill runtime existed. It is not a gate-truth playbook. The replacement
> playbook must be generated after `complete-topic-synthesis-split-skill-runtime`
> lands.

## Why

The topic synthesis split-skill design now has stage schemas, handoff
contracts, and generated skill packages, but it does not yet have a real
end-to-end create-topic run artifact that future tests can use as a baseline.
Schema-only examples are too synthetic to catch Host Bridge contract drift,
resolver shape changes, or stage-to-stage handoff mismatches.

## What Changes

- Add a real DETR create-topic-synthesis playbook under
  `artifact/topic-synthesis-create-detr-playbook/`.
- Capture read-only Zotero Bridge transcripts for status, manifest summary,
  topic duplicate check, library index probing, resolver execution, citation
  metrics, and paper artifact availability diagnostics.
- Materialize stage payload examples for the four topic synthesis skill phases:
  prepare, core enrichment, and finalize.
- Keep the artifact as a dry-run candidate only. It does not register a
  workflow, switch existing `create-topic-synthesis` behavior, or write the
  simulated result back to Zotero.

## References

- Legacy runtime/output contract:
  `skills_builtin/create-topic-synthesis/SKILL.md`
- Split skill source of truth:
  `skills_src/topic-synthesis/contracts/*.json`
- Prior design anchor:
  `artifact/topic-synthesis-multi-skill-contract-design.md`
- New real-run baseline:
  `artifact/topic-synthesis-create-detr-playbook/playbook.md`

## Impact

- Adds documentation, schema examples, and focused test coverage only.
- Uses real local Zotero Bridge data collected from the DETR seed, with only
  necessary metadata and short evidence summaries retained.
- Does not modify Zotero data, existing workflows, builtin skill entrypoints,
  or generated package registration.
