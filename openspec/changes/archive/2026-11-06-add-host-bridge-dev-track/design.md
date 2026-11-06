# Design

## Context

See proposal.md for motivation. The clean baseline is `a4f43ad40e189a38f260d7917224b6f39a91372d` on dev. The published immutable set `hbrs-8c6de08010d459a0e87e74f2` proves CLI 0.5.1 and all surface versions 0.5.2. Current root build manifests are newer development evidence, not formal completion evidence. There is no available TypeScript language server; CodeGraph and literal callsite searches supply references.

## Goals / Non-Goals

Keep one build and publication pipeline. Keep active root build manifests so existing exact-identity consumers remain simple. Channel history is durable and separate from that build projection. No runtime capability, installer behavior, content-package policy, or agent-facing instruction semantics change. No remote publication is authorized by implementation approval.

## Decisions

- Add `releases/host-bridge/versions.json` with `version` (stable) and `dev_version`. Initialize 0.5.1 and 0.5.2-dev.0 from published evidence. The active Cargo version and root cli-release.json are changed only by explicit preparation, not by installing this tooling change.
- A small Node-only shared module `scripts/host-bridge/host-bridge-release-channels.mjs` owns channel validation, strict SemVer parsing, path/ref resolution, and version-counter interpretation. Exports: `resolveHostBridgeChannel(value = "stable")`; `hostBridgeChannelForVersion(version)`; `hostBridgeReleasePaths(channel)` returning `{releaseSet, receipt}` for `releases/host-bridge/<channel>/release-set.json` and `.../latest-complete-release-receipt.json`; `hostBridgePublicationTargets(channel)` returning `{ref, cliBundle, libraryAgent, librarianProfile}` where ref is main/dev, CLI refs are host-bridge/zotero-bridge-cli-bundle and host-bridge/zotero-bridge-cli-bundle-dev, Generic/Hermes refs main/dev. `readHostBridgeVersions(root)` and `resolveHostBridgeCliVersion(versions, channel)` own counters.
- The root release-set.json remains the active generated projection. Channel-local snapshots bind prepared/finalized release sets; complete receipts are channel-local. Planning compares completed channel history, not the opposite channel or an uncompleted active projection. On first dev release use the stable completed source as the accumulated comparison basis.
- Existing surface `patch` fields remain the stable counters; dev renders their current patch plus the CLI dev suffix without mutating them. Stable preparation restores the published channel baseline patches before calculating the single required patch change, so previously accumulated unpublished patches do not escape into formal versions.
- Add a channel field to new release sets and receipts while historical complete records can be identified as stable from their non-prerelease CLI identity. Validate branch, CLI version, surface versions, and all three target refs before dispatch. Release identity binds channel. The workflow receives `channel`, validates it before effects, consumes the exact committed active projection, and finalizes the selected source branch and channel records. Immutable tags remain content-addressed.
- Record `binariesVersion` when binary checksums are recorded and preserve it across version preparation. Include CLI/binary version mismatch in prebuildRequired and freshness. Historical recorded binaries without the field use their manifest version as their original build identity, not the newly requested version. Existing seven-platform aggregate storage and exact sync validation remain unchanged.
- Preparation is idempotent for an already prepared target/fingerprint. Dev surface-only changes still get a new dev prerelease, avoiding repeated version identities. Stable surface-only changes need not rebuild CLI. Changing Cargo version, even with the same normalized fingerprint, requires a version-matching aggregate.

## Risks / Trade-offs

- Root generated build projections can be for either channel → validate channel/version/ref at publication and keep completed histories independent.
- Stable and dev embedded CLI versions require different executable bytes → do not promote by relabeling; preserve version-bound freshness.
- Repeated preparation can otherwise consume counters → distinguish the current prepared target/fingerprint and completed channel identity.
- Semantic preservation: no agent-facing source instructions are edited; explicit deletion inventory is empty. Operational release/prebuild Skills are updated separately. Surface parity counters must remain zero.

## Migration Plan

Retain current active Cargo/CLI/binaries unchanged. Import the verified stable release-set and move the matching complete receipt to stable history. Create independent counters. Update every history reader and writer to channel paths; do not retain an obsolete root complete-receipt alias. Subsequent explicit dev preparation selects its version, builds seven-platform binaries through the existing authorized workflow, then renders and publishes. Stable preparation selects from the stable counter and its completed surface baseline.

## Verification

Extend existing packaging, coordinator, and surface-manifest suites at their public boundaries. Cover iteration isolation, version-only freshness, stable promotion, all publication target refs, receipt recovery, and cross-channel rejection. Exercise real read-only plan commands and a temporary fixture through preparation/rendering; never dispatch remotely for a smoke check.

## Observed Verification

- The combined packaging/coordinator/surface/mirror/ACP packaging suites completed with 123 passing and one existing pending `cli_binary_unavailable` case. An obsolete 256-line workflow/source/Skill wording assertion was removed rather than repinned to the new implementation.
- `tsc --noEmit -p tests/tsconfig.json`, affected-file ESLint, and affected-file Prettier checks passed. Both edited workflows parsed as YAML; `bash -n` accepted all 37 executable shell blocks.
- Actual stable/dev plan commands selected CLI `0.5.2` and `0.5.2-dev.0`; stable surface candidates were all `0.5.3`. Both correctly required a new exact-version aggregate.
- A temporary checkout exercised production preparation through `prebuild_required`, repeated preparation without another bump, then `prepared` through the actual render/check commands using seven synthetic binary fixtures. The Rust command inventory/Agent Surface exporters were real; the seven-platform executable bytes were fixtures, not release evidence.
- The fixture rendered dev surfaces `0.5.4-dev.0`, `0.5.5-dev.0`, and `0.5.5-dev.0` without changing the stable patches/history. It exercised the actual controller CLI: dev validation succeeded, stable validation of a dev set failed, and a mismatched receipt channel was rejected without modifying that receipt.
- Promotion to stable selected `0.5.2`, retained the old dev `binariesVersion`, and stopped for a new build. Repeated stable preparation and a subsequent unpublished source change still selected `0.5.2`.
- The isolated smoke exposed ambient-working-directory CLI manifest resolution. Surface version lookup now resolves from the supplied definitions directory; the existing surface test covers a second checkout with its own dev manifest.
- `check:host-bridge-content` reported no generated drift and aligned consumer guidance; `check:host-bridge-doc-sync` passed. Its 27 advisory depth warnings are accepted unchanged: they are existing generated per-command references, no governed instruction source or materialized instruction content was edited, and the exhaustive command-card behavior checks passed.
- Semantic review was scoped to the fixed starting commit with `HOST_BRIDGE_SEMANTIC_REVIEW_BASE`. Only operational release/prebuild guidance changed; minimum-core, Generic, Hermes, and Agent Control Contract instructions remain aligned and unchanged. Explicit deletion inventory is empty; unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts are all zero for this change. No review-mirror translation regeneration is needed for unchanged agent-facing instructions.
- Strict OpenSpec validation passed. No GitHub workflow was dispatched, no production seven-platform build or XPI build was performed, and no source commit/push or active Cargo/binary replacement was made.
