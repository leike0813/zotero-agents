---
name: host-bridge-semantic-surface-review
description: Review Host Bridge capability, CLI, workflow control, wrapper semantic source, Zotero Librarian profile semantic source, and release-render changes before running the Host Bridge release pipeline renderer.
---

# Host Bridge Semantic Surface Review

Use this skill before `npm run render:host-bridge-surface` when Host Bridge capability, REST endpoint, CLI, workflow control, workflow catalog, OpenSpec Host Bridge spec, wrapper semantic source, or Zotero Librarian profile semantic source files changed.

## First Action

Run the read-only context collector from the repository root:

```powershell
npx tsx scripts/host-bridge-semantic-review-context.ts
```

Use the returned JSON to decide review focus. The script classifies changed files; it does not decide whether the semantic layer is correct.

## Workflow

1. Read `references/surface-map.md` to identify the relevant spec layer, semantic sources, and generated targets.
2. Read `references/review-playbook.md` and inspect the changed spec-layer files plus the semantic source files it names.
3. If the current semantic sources already explain the changed control surface accurately, report that no semantic-source edit is needed.
4. If the semantic sources are incomplete or misleading, update only the semantic sources.
5. Do not edit generated output as the source of truth. After semantic review completes, return control to `$host-bridge-release-pipeline` so it can run the renderer and checks.

## LLM And Script Boundary

The LLM owns semantic comparison, wording, scope decisions, and final review judgment.

Scripts only collect changed-file context and run deterministic checks. Do not write scripts that summarize intent, choose wording, or replace the semantic review.

## Optional Subagent Path

If the current environment can delegate to subagents, independent semantic-source files may be reviewed in parallel. If subagents are unavailable, review the same files serially.

The main agent keeps final responsibility for merging findings, editing semantic sources, and reporting the result. Subagents must not run render commands or edit generated targets.

## Completion Report

Return these fields to the release pipeline:

- semantic review ran: yes/no
- context collector result: review required yes/no
- semantic source edits: list of files or none
- alignment result: aligned or edits applied
- next commands: render and checks to run

## References

- `references/surface-map.md`: path groups and review focus.
- `references/review-playbook.md`: review steps, boundaries, and completion criteria.
- `references/nested-call-contract.md`: handoff contract with the Host Bridge release pipeline.
