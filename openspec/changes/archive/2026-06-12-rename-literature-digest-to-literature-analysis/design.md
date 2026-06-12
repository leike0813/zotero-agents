## Context

The `literature-digest` workflow at `workflows_builtin/literature-workbench-package/literature-digest/` is a built-in ACP workflow that dispatches to a skill-runner backend via `skill_id: "literature-digest"`. The underlying skill has been fully rewritten and is now available as a git submodule at `skills_builtin/literature-analysis/`. The workflow must be renamed to match and reference the new skill.

The workflow consists of:
- `workflow.json` — workflow definition (id, label, execution config, hooks)
- `hooks/buildRequest.mjs` — builds skill-runner request with `skill_id`
- `hooks/filterInputs.mjs` — pre-execution input filtering
- `hooks/applyResult.mjs` — processes results into Zotero notes
- `assets/zt-note.eta`, `assets/zt-field.eta` — export templates
- `README.md`

Registration spans two files: `manifest.json` (file listing) and `workflow-package.json` (package workflow list).

Two library files (`noteCodecs.mjs`, `digestPayload.mjs`) recognize a note `kind` string that includes `"literature-digest"`. Existing Zotero notes already have this kind embedded and must continue to be decodable.

## Goals / Non-Goals

**Goals:**
- Rename the workflow directory from `literature-digest/` to `literature-analysis/`
- Update workflow `id` and `label` in `workflow.json`
- Update `skill_id` in `buildRequest.mjs` to `"literature-analysis"`
- Update all hook internal strings (error messages, log prefixes, component labels)
- Update registration files to reflect new directory path
- Add backward-compatible recognition of `"literature-analysis"` kind in library files while preserving `"literature-digest"` kind support
- Update source code UI strings and reviewer labels
- Rename test directories and update all test references (~30 files)
- Update mock skillrunner dispatch tables

**Non-Goals:**
- Remove or modify the `skills_builtin/literature-digest/` submodule (separate concern)
- Clean up stale env vars in `skills_builtin/literature-analysis/` (submodule changes not included)
- Behavioral changes to the workflow logic beyond the rename
- Changes to `openspec/specs/` requirement semantics — only nomenclature updates

## Decisions

**Decision 1: git mv for directory rename**
Use `git mv workflows_builtin/literature-workbench-package/literature-digest/ workflows_builtin/literature-workbench-package/literature-analysis/` rather than creating new files and copying. This preserves file history and avoids a "delete + add" diff.

**Decision 2: Keep old kind strings in library files**
`noteCodecs.mjs` and `digestPayload.mjs` decode `data-zs-note-kind` attributes from existing Zotero notes. Old `"literature-digest"` entries exist in user libraries. Removing the old kind check would break note display for all existing digests. Strategy: add `"literature-analysis"` as a new recognized kind alongside the existing `"literature-digest"` — both map to the same digest behavior.

**Decision 3: Bulk string replacement for test files**
~30 test files reference `"literature-digest"` as a string literal for workflow ID, skill ID, fixture paths, etc. These are uniformly pattern-matched replacements. Using find-and-replace per file rather than manual editing reduces error risk.

**Decision 4: Mock server dispatch must match new skill_id**
The mock skillrunner at `test/mock-skillrunner/server.ts` dispatches on `skillId === "literature-digest"`. After the rename, `buildRequest.mjs` sends `skill_id: "literature-analysis"`, so the mock must match. Both dispatch condition and route registration updated.

## Risks / Trade-offs

- **Silent test failure if fixture paths aren't renamed**: `fixturePath("literature-digest", ...)` appears across multiple test files and the fixture directory is being renamed. Must use `git grep` after changes to verify zero remaining references.
- **Backward compat regression**: If old `"literature-digest"` kind check is accidentally removed from library files, existing user notes break. Mitigation: retain both checks explicitly, code review the library file diffs.
- **Domain filter mismatch**: `test/zotero/domainFilter.ts` has hardcoded `describe()` title prefixes. Test renames must stay in sync with domain filter patterns, otherwise Zotero test routing skips these tests silently.
