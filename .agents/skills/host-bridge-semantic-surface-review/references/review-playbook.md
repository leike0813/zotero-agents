# Review Playbook

## Review Steps

1. Run `npx tsx scripts/host-bridge-semantic-review-context.ts`.
   The collector compares the current checkout with the merge-base of `origin/main` or `main`, then adds staged, unstaged, and untracked files.
2. If `reviewRequired` is false, inspect `recommendedFocus`. If it only reports generated-target drift, return to the release pipeline and recommend render/check verification.
3. If `reviewRequired` is true, read every path in `specLayerChanges` that affects Host Bridge behavior.
4. Read the shared control facts, CLI wrapper, Zotero Library Agent, and Zotero Librarian profile semantic sources named in `surface-map.md`.
5. Compare changed behavior against semantic guidance:
   - command family and command choice
   - exact CLI version, build fingerprint, and command catalog identity
   - command input/output schema, risk, approval, pagination, and file output
   - consumed and returned typed handles
   - retryability, state change, handle consumption, and safe next actions
   - workflow lifecycle and apply-back behavior
   - structured `executionModes`, ownership, monitoring, and apply-back requirements
   - apply receipt state for preflight failure and partial write-back failure
   - `workflowRunId`, `skillRunId`, `agentRunId`, and related handle boundaries
   - approval, mutation, reply, connect, cancel, and file-transfer behavior
   - profile operating principles and scheduled work assumptions
   - on-demand versus resident task ownership
6. Edit semantic sources only when the current guidance would cause an agent to choose the wrong command, use the wrong handle, skip a required review/apply path, or miss a new control surface that needs semantic explanation.
7. Leave generated command lists, endpoint tables, and capability tables to the renderer.

## Current-State Rule

Write only the current valid behavior. Do not include migration notes, version comparisons, changelog language, or instructions about earlier command paths.

## Completion Criteria

The review is complete when one of these is true:

- No semantic-source edit is needed, and the reason is stated.
- Semantic-source edits are made, and the edited files are listed.

After completion, return to the release pipeline so it can run:

```powershell
npm run render:host-bridge-surface
npm run check:host-bridge-doc-sync
npm run check:host-bridge-surface
npm run check:zotero-library-agent-bundle
npm run check:zotero-librarian-profile
```

Run additional focused tests when the changed behavior touches CLI parsing, packaging, workflow control, or profile distribution.
