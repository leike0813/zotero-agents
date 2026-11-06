# Release-Set Operations

## Channels and records

Host Bridge publishes on two channels. `stable` is the default; `dev` is the
development track. Each channel has its own source branch, mutable surface
refs, and version counter:

| Channel | Source branch | CLI bundle ref | Generic ref | Hermes ref | Version counter |
| --- | --- | --- | --- | --- | --- |
| `stable` | `main` | `host-bridge/zotero-bridge-cli-bundle` | `main` | `main` | `version` |
| `dev` | `dev` | `host-bridge/zotero-bridge-cli-bundle-dev` | `dev` | `dev` | `dev_version` |

Both counters live in `releases/host-bridge/versions.json`. Development
versions are strict `X.Y.Z-dev.N` prereleases: one development iteration
advances only `N`, and the stable counter does not move. Stable preparation
derives its version from the stable counter and restores the published
baseline surface patches from completed history before applying the one
required patch change. A line that follows a released stable version starts
at the next patch's `-dev.0`.

Completed history is channel-local. `releases/host-bridge/stable/` and
`releases/host-bridge/dev/` each hold `release-set.json` and
`latest-complete-release-receipt.json` for that channel. The root
`releases/host-bridge/cli-release.json` and
`releases/host-bridge/release-set.json` are the active build projection for
whichever channel prepared them. Use channel records for completed planning
baselines; the active root set is the exact prepared candidate for dispatch
and same-set recovery, not proof that either channel completed publication.

## Content review and gates

Run the semantic review when its collector returns `reviewRequired: true`. Then use the unified Host Bridge renderer and content gate exposed by `package.json`, followed by:

```sh
npm run check:host-bridge-doc-sync
npx tsx scripts/host-bridge/check-host-bridge-skill-packages.ts <minimum-core-root> <generic-root> <generic-task-root> <hermes-root>
npm run check:host-bridge-review-mirror
```

Derive these roots from `contracts/host-bridge/surfaces.json`; include `skills/zotero-library-agent` and all five task Skills beneath the Generic source root. The manifest resolver determines inherited components and materialization mounts.

After any governed Markdown semantic change, run `$host-bridge-review-mirror` before the final check. The mirror translates each owned source once and records effective inheritance in its index and v2 provenance. This is a local Agent gate; it does not add an automatic CI or push-triggered publication path.

## Version and prebuild decisions

Read the accumulated plan for the selected channel:

```sh
npm run release:host-bridge:plan -- --channel dev
```

Omit `--channel` for stable. Planning compares the selected channel's completed history; when dev has no completed set yet, it uses the completed stable source as its comparison basis. The CLI release supplies the major.minor line and each surface's own `patch` comes from the manifest. Development iteration renders that patch plus the CLI prerelease suffix without consuming the stable counter. A CLI patch or inherited component digest may change an exact release set without changing a downstream surface patch. Let the plan classify source changes; do not manually infer a bump from generated drift.

The plan reports `prebuildRequired` when the current build fingerprint differs from the recorded binary build fingerprint, or when the recorded `binariesVersion` differs from the target CLI version. Preparation repeats that version check after it locks its target. Binary identity is version-bound: a set built for `X.Y.Z-dev.N` never satisfies a stable `X.Y.Z` preparation, even with an identical source fingerprint.

When `prebuildRequired` is true, first run preparation to lock its target identity. After the required Git authorization, commit and push that locked identity, then use `$host-bridge-cli-prebuild` to dispatch `build-host-bridge-cli-prebuilds.yml` and synchronize its exact aggregate from `host-bridge-cli-prebuilds`. Repeat the same preparation command after freshness passes. When no prebuild is required, run:

```sh
npm run check:host-bridge-cli-prebuild-freshness
```

### Build-only prebuilds

Use `$host-bridge-cli-prebuild` to run or resume the exact seven-platform workflow for the selected source branch after preparation has locked and the authorized Git operation has pushed that identity. Require its structured run identity, content-addressed aggregate, transactional local synchronization, and passing freshness gate before repeating preparation to render the publishable release set.

The prebuild Skill does not bump versions, prepare or publish a release set, commit or push source changes, merge branches, or invoke Gitee. Formal publication remains a separate clean synchronized source-branch procedure with an exact prepared release set and explicit `release:host-bridge:dispatch` authorization.

## Preparation, dispatch, and recovery

Lock the target, then repeat the same command after any required prebuild:

```sh
npm run prepare:host-bridge-release -- --channel dev
npm run prepare:host-bridge-release -- --channel dev --cli-version X.Y.Z-dev.N
```

Omit `--channel` for stable. Use an exact target when one is approved; for stable the target has the form `X.Y.Z`. Use `--intent minor` only for an approved protocol or schema-line change without an exact target. Run preparation on the channel's source branch; it rejects any other branch. Preparation locks the target version, fingerprint, and channel before rendering. If the recorded binaries do not match the target version or the current fingerprint, it returns status `prebuild_required` with exit code 2 and stops before rendering the publishable release set. In that case run `$host-bridge-cli-prebuild` for the locked identity, then repeat the same preparation command. Repeating an already prepared target and fingerprint is idempotent: it consumes no additional counter and preserves the prepared version identity. Stable surface-only changes need no CLI rebuild; a changed Cargo version always requires a version-matching aggregate.

Commit and push the prepared sources to the selected source branch before dispatch.

Dispatch the exact release set only after explicit authorization:

```sh
npm run release:host-bridge:dispatch -- --channel dev --release-set-id hbrs-... --watch
```

Omit `--channel` for stable. Dispatch requires the current branch to equal the channel's source branch (`main` for stable, `dev` for dev), a clean worktree, a pushed `HEAD` equal to the remote source branch tip, and the committed root release set whose `releaseSetId` and channel match. The command validates branch, CLI version, surface versions, and all three mutable target refs before any effect. The workflow advances only the selected channel's refs, finalizes only the selected source branch, and writes only the selected channel's records.

If finalization reports concurrent Host changes, use the workflow's uploaded finalize artifact to resume this release set. Completion requires verified immutable surfaces, advanced channel mutable pointers, selected source-branch finalization, and a complete channel receipt at `releases/host-bridge/<channel>/latest-complete-release-receipt.json`. A receipt from the other channel is not recovery evidence. Gitee is outside this procedure.
