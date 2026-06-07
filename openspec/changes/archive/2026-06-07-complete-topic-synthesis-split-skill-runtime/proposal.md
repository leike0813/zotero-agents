# Complete Topic Synthesis Split Skill Runtime

## Why

The generated topic synthesis split-skill packages currently contain a smoke
gate only. They can render `SKILL.md` and schema assets, but they cannot produce
the runtime truth needed for a real create topic synthesis run: SQLite state,
action receipts, Host Bridge resolver cascade, handoff manifests, sidecars,
sections, or the final candidate bundle.

The DETR playbook must be generated from the new split-skill runtime, not from
the legacy monolithic `create-topic-synthesis` runtime and not from hand-written
schema examples.

## What Changes

- Upgrade the generated package runtime from smoke-only `scripts/gate.py` to a
  real package-local gate/runtime entrypoint.
- Add SQLite state, action receipts, artifact registry, paper workset, paper
  triage, and handoff registry support.
- Implement the create path across:
  - `create-topic-synthesis-prepare`
  - `topic-synthesis-core-enrichment`
  - `topic-synthesis-finalize`
- Keep update prepare as schema/gate skeleton for a later change.
- Regenerate the four builtin packages from `skills_src/topic-synthesis`.
- Mark the existing DETR playbook change as superseded by the future
  gate-truth playbook.

## Impact

- Does not register the new packages as existing workflow defaults.
- Does not write back to Zotero.
- Does not add dependencies.
- Does not start a development server.
