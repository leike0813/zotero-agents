---
name: host-bridge-release-pipeline
description: Prepare, validate, dispatch, resume, and verify the three Host Bridge surfaces as one release set on the stable or dev channel. Use when approved Host Bridge source changes need governed publication.
---

# Host Bridge Release Pipeline

## Goal

Publish the manifest-defined minimum-core, Generic, and Hermes surfaces for the selected channel (`stable` by default, `dev` for development) from one exact CLI identity and one complete release set, after local gates and explicit publication authorization.

## Inputs

- The target channel: `stable` (default) or `dev`.
- A clean, synchronized checkout of the channel's source branch — `main` for stable, `dev` for dev — with an approved source change.
- `contracts/host-bridge/surfaces.json`, the active build manifests `releases/host-bridge/cli-release.json` and `releases/host-bridge/release-set.json`, `releases/host-bridge/versions.json`, and the selected channel's complete receipt at `releases/host-bridge/<channel>/latest-complete-release-receipt.json`.
- Explicit publication authorization and, when supplied, an exact CLI version target.

## Workflow

1. Read [release-set operations](references/release-set-operations.md). Inspect the manifest and run `npm run release:host-bridge:plan -- --channel dev` for dev; omit `--channel` for stable.
2. Run `$host-bridge-semantic-surface-review` when the collector requires review. Resolve every manifest layer and stop if its handoff is blocked.
3. Render and validate content with the unified renderer, then run `npm run check:host-bridge-content`, the documentation gate, and the Skill-package validator. Use the manifest to pass every governed Skill root to `scripts/host-bridge/check-host-bridge-skill-packages.ts`. Run `$host-bridge-review-mirror` after semantic changes and require `npm run check:host-bridge-review-mirror` to pass before preparation or dispatch.
4. Run `npm run prepare:host-bridge-release -- --channel dev` for dev (omit `--channel` for stable), optionally passing the approved exact CLI target. Preparation locks the target version, fingerprint, and channel. Status `prebuild_required` (exit code 2) means no publishable release set was rendered: obtain the required Git authorization, commit and push the locked source identity, then use `$host-bridge-cli-prebuild` for that exact seven-platform build. After synchronization and freshness verification, repeat the same preparation command; it is idempotent for the locked target and inputs.
5. Require preparation status `prepared`. Commit and push the complete prepared set to the channel's source branch under the applicable Git authorization; a successful prebuild alone is not a prepared release set.
6. Re-run `npm run check:host-bridge-content` and the other local gates, then dispatch only after explicit publication authorization: `npm run release:host-bridge:dispatch -- --channel dev --release-set-id hbrs-... --watch` for dev (omit `--channel` for stable). The command dispatches and watches the exact `release-host-bridge.yml` run.
7. Verify all immutable surfaces, the channel's mutable pointers, finalization of the channel's source branch, and the channel's complete receipt before reporting success.

## Build-only prebuild handoff

Use `$host-bridge-cli-prebuild` for channel source-branch dispatch, exact run recovery, result-artifact validation, transactional seven-platform synchronization, and freshness verification. Treat its completed evidence as an input to release preparation; it does not prepare, dispatch, or authorize formal publication. Both channels share the same content-addressed store, but every set binds the exact CLI version: a dev aggregate cannot satisfy a stable preparation at a different version even when the source fingerprint matches.

## Hard constraints

- Use `contracts/host-bridge/surfaces.json` as the only surface composition and patch ownership source. Stable surface versions are CLI major.minor plus the layer-owned patch; dev surfaces carry the CLI prerelease identity without consuming that patch. Exact digests and release-set identity bind bytes.
- Channel, source branch, CLI version, surface versions, and all three mutable target refs must agree before any effect. Stable publishes from `main` to `host-bridge/zotero-bridge-cli-bundle`, `main`, and `main`; dev publishes from `dev` to `host-bridge/zotero-bridge-cli-bundle-dev`, `dev`, and `dev`.
- Development versions advance only `dev_version`; stable versions derive from the stable counter and published baseline patches. Development iterations never consume stable surface patches.
- Channel release records and receipts under `releases/host-bridge/<channel>/` are authoritative history. Root `releases/host-bridge/cli-release.json` and `releases/host-bridge/release-set.json` are the active build projection for the prepared channel; never plan or recover from the other channel's records.
- Semantic review, the ownership-based review mirror, content gates, and Skill-package validation must pass before preparation or publication. Identity locking may report `prebuild_required`; publishable rendering and dispatch require a fresh exact-version seven-platform aggregate.
- The release workflow restores the exact verified seven-platform prebuild aggregate. Do not build selected platforms locally or use GitHub Releases as the prebuild store.
- A prebuild set is version-bound. Never relabel development binaries with the stable version; promoting an unchanged source fingerprint from dev to stable requires newly built binaries at the stable version.
- Dispatch only the exact prepared `releaseSetId`; retries reuse it and never associate different bytes with an immutable tag or surface version. A receipt from the other channel is not recovery evidence.
- Host Bridge publication requires an explicit `release:host-bridge:dispatch` action. Do not trigger it from ordinary pushes or CI.
- Do not invoke Gitee synchronization as part of this pipeline.
- A build-only prebuild is evidence only. It does not prepare a release set, publish a surface, commit or push source changes, or relax the clean synchronized source-branch and explicit authorization requirements for formal publication.

## Completion

Report the channel and source branch, semantic-review and review-mirror status, manifest-resolved surface versions, exact CLI identity (version and recorded binaries version), releaseSetId, local gate results, prebuild aggregate and commit, workflow run, immutable and mutable surface commits, source finalization commit, and the channel receipt path with `host-bridge.release-receipt.v2` status `complete`.

## Failure handling

If any gate, prebuild check, publication verification, or finalization step fails, preserve the exact releaseSetId, channel release records, receipt, workflow run, and structured failure. Resume the same prepared set only through the documented recovery path. Do not prepare another set to compensate for a failed render, workflow, network, or publication step.

## References

Read [release-set operations](references/release-set-operations.md) before planning, preparing, dispatching, resuming, or verifying publication.
