# Release Playbook

Use this reference for the normal release path after
`scripts/release-coordinator-gate.ts` has produced an audit.

## Stage 1: Audit

Run:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z
```

If the gate reports `audit_complete`, ask the user for the target plugin
version. Use a `v`-prefixed semver tag for the plugin release command.

## Stage 2: SkillRunner Runtime Feed

Check `feeds/skillrunner-runtime/feed.json` when the release changes the
supported SkillRunner runtime version or plugin compatibility range.

Use the project script for updates:

```powershell
npm run update:skillrunner-runtime-feed -- --plugin ">=0.5.0 <0.6.0" --skillrunner v0.7.3
```

After an update, include the feed file in the release change set and rerun the
gate.

## Stage 3: Host Bridge

If the gate returns `run_host_bridge_pipeline`, use `$host-bridge-release-pipeline`.
Record the prepared `releaseSetId`; preparation and local verification do not
satisfy this gate. Explicitly dispatch or resume that exact release set with
`npm run release:host-bridge:dispatch -- --release-set-id hbrs-... --watch`,
then verify its
`host-bridge.release-receipt.v2` has `status: complete` before rerunning:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --host-bridge-done
```

Keep the Host Bridge pipeline report in the final release summary.

## Stage 4: Content Package

If the gate returns `publish_content_package`, decide the content package bump
with the user when it is not obvious.

The descriptor's `version` belongs to stable/beta. Its independent
`dev_version` uses `X.Y.Z-dev.N`. Formal release iterations use:

```powershell
npm run release:content-package -- <patch|minor|major|version>
```

For a development iteration, increment only dev.N:

```powershell
npm run release:content-package -- patch --channel dev
```

Choose a new dev base with an explicit `X.Y.Z-dev.N` target; dev minor/major
targets are not implicit base changes. Development iterations never consume
the formal version counter.

After committing and pushing the content package version change, dispatch the
content feed publication:

```powershell
npm run release:content-package -- --dispatch --channels stable,beta --ref main --watch
```

A standalone dev Content Package release uses the same content stage with:

```powershell
npm run release:content-package -- --dispatch --channels dev --ref dev --watch
```

For a formal publication, verify:

```powershell
npm run check:content-package-release
```

The default check covers stable/beta. After dev publication use
`npm run check:content-package-release -- --channels dev`. These checks use
each channel's own published revision and timestamp to rebuild current content
in temporary output, then verify ZIP bytes and checksums. Before build,
`npm run check:content-package-release -- --current-branch` selects stable/beta
on main or dev on a dev-prefixed branch; it fails for other branches without
an explicit scope. Stale content blocks build and requires authorized version
preparation/publication followed by rechecking. Real Zotero tests also require
installing/updating the corresponding content channel in the test profile.

Content Package publication is independent of the Host Bridge complete receipt.
The matching receipt is enforced by the plugin tag-release workflow because the
seven Host Bridge Skills are XPI assets.

Rerun the gate with content package evidence only when verification passes:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --content-package-release-verified
```

The content publication workflow creates immutable GitHub release assets. A
rerun may reuse an asset only when its SHA-256 matches; different bytes require
a new content package version. Gitee availability is outside this stage.

## Stage 5: Local Gates

Run:

```powershell
npm run test:node:full
npm run lint:check
```

If Host Bridge files were involved, also keep the Host Bridge pipeline local
checks in the release report.

Rerun the gate with local evidence:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --test-node-full-passed --lint-check-passed
```

## Stage 6: Sync Main

Before releasing, confirm `HEAD` is on `main`, the working tree is clean, and
`HEAD` is available on GitHub `main`.

Ask before pushing:

```powershell
git push origin main
```

Rerun the gate after pushing.

## Stage 7: Plugin Release

When the gate returns `ready_to_release`, ask for explicit approval to run:

```powershell
npm run release -- vX.Y.Z --yes
```

This command is allowed only after the gate confirms:

- clean `main`
- local gates passed
- required content package verification passed
- required Host Bridge pipeline completed
- target tag is not present locally or on GitHub
- `HEAD` is synced to GitHub `main`

## Stage 8: Optional Manual Gitee Synchronization

Canonical publication is complete without Gitee. Report this optional command
to the user after the plugin and content package releases are verified:

```powershell
npm run sync:gitee-release
```

The defaults come from `package.json` and the formal `version` in
`content-package.version.json`.
Historical or explicitly selected releases can be synchronized with:

```powershell
npm run sync:gitee-release -- --plugin-version vX.Y.Z --content-version X.Y.Z
```

Use the content-only scope when only a published content release must be
mirrored, for example to correct a mirror without touching plugin refs, XPI
assets or plugin update metadata:

```powershell
npm run sync:gitee-release -- --content-only --content-version X.Y.Z
```

For a separately requested dev mirror, select its published `dev_version`
explicitly, for example:

```powershell
npm run sync:gitee-release -- --content-only --content-version 0.8.10-dev.0
```

Each invocation mirrors one release tag; its channel inventory determines the
assets to copy. The command does not infer dev from the current branch.

The command reads `GITEE_TOKEN` from the repository `.env`, downloads plugin
and content release assets from GitHub, synchronizes the existing Gitee
branches/tags/releases, and verifies refs and asset hashes. It is blocking and
safe to rerun. The agent must not execute or watch it unless the user separately
requests Gitee synchronization.

Content synchronization follows these rules:

- the source is the published GitHub release inventory; only channels whose ZIP
  and checksum asset are both published are synchronized
- the release tag and the `content-feed` branch are captured from GitHub before
  any mutation and pushed to Gitee from an isolated temporary repository
- GitHub bytes are verified against their checksum asset and against the
  canonical channel feed at the captured commit before anything is uploaded;
  existing Gitee assets are reused when identical and never replaced when
  different
- the feed advances only after every mirrored asset is read back and downloads
  anonymously with the expected digest, size and checksum; the feed then moves
  as an ordinary fast-forward, and a conflicting Gitee ref fails instead of
  being forced
- the promotion is confirmed afterwards by comparing the Gitee feed with the
  captured GitHub commit and re-reading both Gitee refs
- the Gitee token is passed to git through its credential helper and never
  appears in a remote URL or a printed command

## Stage 9: Post-release Verification

Verify:

```powershell
gh release view vX.Y.Z --repo leike0813/zotero-agents
gh release view release --repo leike0813/zotero-agents
git ls-remote --tags origin refs/tags/vX.Y.Z
gh release view official-workflows-vCONTENT_PACKAGE_VERSION --repo leike0813/zotero-agents-workflows
npm run check:content-package-release
```

For a dev-only publication, select the `official-workflows-v<dev_version>`
release and verify with `npm run check:content-package-release -- --channels dev`.

If the user separately ran the optional Gitee command, its successful blocking
exit is the mirror verification result. `npm run check:content-package-mirror`
may be used for an additional read-only content mirror audit, but it is not a
canonical release gate.
