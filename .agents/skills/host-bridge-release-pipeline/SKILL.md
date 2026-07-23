---
name: host-bridge-release-pipeline
description: Prepare, validate, dispatch, resume, and verify the three Host Bridge surfaces as one release set. Use when approved Host Bridge source changes need governed publication.
---

# Host Bridge Release Pipeline

## Goal

Publish the manifest-defined minimum-core, Generic, and Hermes surfaces from one exact CLI identity and one complete release set, after local gates and explicit publication authorization.

## Inputs

- A clean, synchronized `main` checkout with an approved source change.
- `host-bridge/surfaces.json`, `cli/zotero-bridge/release.json`, and the latest complete release receipt.
- Explicit publication authorization and, when supplied, an exact CLI version target.

## Workflow

1. Read [release-set operations](references/release-set-operations.md). Inspect the manifest and run `npm run release:host-bridge:plan`.
2. Run `$host-bridge-semantic-surface-review` when the collector requires review. Resolve every manifest layer and stop if its handoff is blocked.
3. Render and validate content with the unified renderer, then run `npm run check:host-bridge-content`, the documentation gate, and the Skill-package validator. Use the manifest to pass every governed Skill root to `scripts/check-host-bridge-skill-packages.ts`. Run `$host-bridge-review-mirror` after semantic changes and require `npm run check:host-bridge-review-mirror` to pass before preparation or dispatch.
4. Confirm the exact CLI prebuild aggregate on `host-bridge-cli-prebuilds`. When the plan requires it, dispatch only the build-only prebuild workflow, synchronize the exact aggregate, and re-check it locally. Otherwise run `npm run check:host-bridge-cli-prebuild-freshness`.
5. Prepare exactly once with `npm run prepare:host-bridge-release`, optionally passing the explicit exact CLI target. Commit and push the complete prepared set to `main`.
6. Re-run `npm run check:host-bridge-content` and the other local gates, then dispatch `npm run release:host-bridge:dispatch -- --release-set-id hbrs-... --watch` only after explicit publication authorization. The command dispatches and watches the exact `release-host-bridge.yml` run.
7. Verify all immutable surfaces, mutable pointers, source-main finalization, and the complete receipt before reporting success.

## Hard constraints

- Use `host-bridge/surfaces.json` as the only surface composition and patch ownership source. Surface versions are CLI major.minor plus the layer-owned patch; exact digests and release-set identity bind bytes.
- Do not render, prepare, dispatch, resume, or publish while semantic review, the ownership-based review mirror, content gates, Skill-package validation, or prebuild freshness is blocked.
- The release workflow restores the exact verified seven-platform prebuild aggregate. Do not build selected platforms locally or use GitHub Releases as the prebuild store.
- Dispatch only the exact prepared `releaseSetId`; retries reuse it and never associate different bytes with an immutable tag or surface version.
- Host Bridge publication requires an explicit `release:host-bridge:dispatch` action. Do not trigger it from ordinary pushes or CI.
- Do not invoke Gitee synchronization as part of this pipeline.

## Completion

Report semantic-review and review-mirror status, manifest-resolved surface versions, exact CLI identity, releaseSetId, local gate results, prebuild aggregate and commit, workflow run, immutable and mutable surface commits, source finalization commit, and `host-bridge.release-receipt.v2` status `complete`.

## Failure handling

If any gate, prebuild check, publication verification, or finalization step fails, preserve the exact releaseSetId, receipt, workflow run, and structured failure. Resume the same prepared set only through the documented recovery path. Do not prepare another set to compensate for a failed render, workflow, network, or publication step.

## References

Read [release-set operations](references/release-set-operations.md) before planning, preparing, dispatching, resuming, or verifying publication.
