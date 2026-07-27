---
name: synthesis-sidecar-release-pipeline
description: Prepare, dispatch, resume, and verify a governed Synthesis sidecar runtime release set. Use when approved sidecar changes must be materialized as locked plugin release input.
---

# Synthesis Sidecar Release Pipeline

## Goal

Turn one already verified seven-platform prebuild aggregate into committed
plugin runtime input. The pipeline binds the release set, source commit,
prebuild result, materialized addon inventory, workflow revision, and complete
receipt. It is the only route for formal sidecar materialization.

## Preconditions

- An approved source change on a clean, synchronized `main` checkout.
- Exact prebuild result evidence from `$synthesis-sidecar-prebuild`.
- A valid v3 bundle set on `synthesis-sidecar-runtime-prebuilds`.
- User authorization to prepare source files when preparation is requested.
- Separate explicit user authorization before workflow dispatch, because it
  writes the shared prebuild branch only indirectly and finalizes source main.

## Boundaries

The pipeline owns only native sidecar release evidence and
`addon/bin/synthesis-sidecar`. It does not select plugin versions, create a
plugin release, modify Host Bridge releases, or synchronize Gitee.

## Inspect first

1. Confirm branch is `main`.
2. Confirm `git status --porcelain` is empty.
3. Fetch `origin/main` and ensure local HEAD equals it.
4. Read the prebuild result and validate its exact identity.
5. Read the prebuild set manifest at the result's exact branch commit.
6. Run `npm run check:synthesis-sidecar-runtime-freshness` when a previously
   materialized set exists.
7. Inspect any existing `synthesis-sidecar/release-set.json` and receipt.

Do not repair a failed prerequisite by committing, changing a version, or
selecting a different prebuild without user direction.

## Prepare

Use `npm run prepare:synthesis-sidecar-release -- --prebuild-result=<file>`.
The command derives a release-set ID from the exact source commit, aggregate,
and prebuild branch commit. The result must bind its `sourceSha` to current
HEAD. Write the resulting `synthesis-sidecar/release-set.json` once, review it,
then commit and push the prepared set to `main` when authorized.

Preparation does not materialize platform bytes. It creates the immutable
intent that a later workflow must obey.

## Release-set validation

Before dispatch, require all of the following facts in the prepared set:

- `schema` is `synthesis-sidecar-runtime-release-set.v1`;
- `releaseSetId` is present and equals the requested value;
- `sourceCommit` equals the exact prepared `main` commit;
- the embedded prebuild result uses the expected schema and source SHA;
- its aggregate and branch commit equal the release-set prebuild fields;
- `materialized.addonRoot` is `addon/bin/synthesis-sidecar`;
- the target list contains exactly the seven supported targets once each.

The release set is a binding document, not a suggestion. Do not edit it after
it has been committed to make a different prebuild fit.

## Receipt transitions

The receipt progresses in this order:

1. `plan` records that the release set is bound to the workflow source.
2. `prebuild` records that its exact content-addressed set was verified.
3. `materialize` records that all seven addon directories were replaced.
4. `receipt` records the complete local evidence document.
5. `finalize` records source-main finalization.

Each completed step is immutable. A receipt may enter `failed` with its first
failed step and message. A recovery reads that same receipt and continues only
from evidence that remains valid for its original release-set ID.

## Authorization boundary

Preparation changes a local source file and needs the user's authorization for
that source change. Dispatch and source-main finalization have separate remote
effects and need explicit publication authorization in the current request.

Do not infer permission from an approved design, a successful prebuild, a
previous release, or a request to inspect a workflow. Do not use an automated
push, tag workflow, or ordinary CI completion as release authorization.

## Audit record

Keep the following values together in the final report and any handoff note:

- release-set ID and source commit;
- prebuild result schema, request ID, run ID, aggregate, and branch commit;
- workflow URL and revision;
- receipt path, status, and all step states;
- finalization commit;
- freshness and XPI inventory gate outcomes.

If any value is unavailable, identify the exact operation that would produce
it. Do not replace missing evidence with an inferred value.

## Stop conditions

Stop and request direction when the requested source commit is not on `main`,
the worktree is not clean, the prebuild result is unavailable, the set branch
commit differs, or a receipt binds another release set. These conditions change
the release identity and cannot be resolved by local edits.

Stop after a complete receipt and finalization have been verified. Plugin tag
publication remains a separate authorized action with its own gates.

## Local gates

Before dispatch, run the sidecar packaging and contract checks relevant to the
change. Require the release plan to identify the committed release-set ID,
source commit, aggregate, and fingerprint. Verify that the release set's seven
target list is complete and that its result uses the exact prebuild branch.

If a complete receipt already matches the same release-set ID and aggregate,
report it as complete. Do not prepare another set merely to repeat a completed
materialization.

## Dispatch

Dispatch only after explicit publication authorization. Use:

```bash
npm run release:synthesis-sidecar:dispatch -- \
  --release-set-id=<ssrs-id> --repo=<owner/repository>
```

The dispatch command requires clean synchronized `main`, a committed release
set at HEAD, an exact source SHA, and an exact workflow run selected by its
request ID. It must never run from a development branch or choose a latest
successful run.

## Workflow responsibilities

The workflow checks out the exact source SHA, confirms it is an ancestor of
`origin/main`, clones the content-addressed branch, and requires the branch
commit recorded by the result. It verifies all seven archives before replacing
the addon runtime root.

It initializes a receipt, records materialization, records the complete
receipt state, and only then finalizes source main. The finalization commit
contains the materialized `addon/bin/synthesis-sidecar`, release set, and
complete receipt together.

## Resume

Resume only the same release-set ID, source SHA, aggregate, request ID, and
workflow run. Check the existing receipt first. Its recorded aggregate and
source SHA must equal the prepared release set.

Never make a new release set, substitute a prebuild result, or switch to a
newer branch commit to recover from a failed workflow. A changed aggregate is a
new release and needs new preparation and authorization.

## Complete receipt gate

A receipt is complete only when plan, prebuild, materialize, receipt, and
finalize steps are all complete for the same release-set ID, source commit, and
aggregate. A partial or failed receipt blocks plugin release. The receipt is
not a log; it is the final materialization proof consumed by the plugin tag
workflow.

## Plugin release handoff

After finalization, check the committed runtime with:

```bash
npm run release:synthesis-sidecar:plan
npm run check:synthesis-sidecar-runtime-freshness
```

The plugin release workflow must find the matching complete receipt and pass
freshness and XPI inventory gates. It must not download a mutable sidecar
GitHub Release tag.

## Failure handling

Preserve the release-set ID, source SHA, aggregate, prebuild result, workflow
run URL, receipt, and transaction backup information. Report the first failed
gate and whether source-main finalization occurred.

If finalization did not occur, resume only the same set after the underlying
infrastructure issue is resolved. If finalization did occur, verify the
receipt and committed inventory rather than replaying publication.

## Completion report

Report release-set ID, source SHA, result schema, request/run IDs, aggregate,
prebuild branch commit, seven-target materialization result, receipt status,
source-main finalization commit, freshness result, and remaining plugin-release
requirements. State explicitly that Gitee synchronization was not run.
