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
satisfy this gate. Publish or resume that exact release set, then verify its
`host-bridge.release-receipt.v1` has `status: complete` before rerunning:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --host-bridge-done
```

Keep the Host Bridge pipeline report in the final release summary.

## Stage 4: Content Package

If the gate returns `publish_content_package`, decide the content package bump
with the user when it is not obvious:

```powershell
npm run release:content-package -- <patch|minor|major|version>
```

After committing and pushing the content package version change, dispatch the
content feed publication:

```powershell
npm run release:content-package -- --dispatch --watch
```

Then verify:

```powershell
npm run check:content-package-release
```

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
npm run release -- vX.Y.Z
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

The defaults come from `package.json` and `content-package.version.json`.
Historical or explicitly selected releases can be synchronized with:

```powershell
npm run sync:gitee-release -- --plugin-version vX.Y.Z --content-version X.Y.Z
```

The command reads `GITEE_TOKEN` from the repository `.env`, downloads plugin
and content release assets from GitHub, synchronizes the existing Gitee
branches/tags/releases, and verifies refs and asset hashes. It is blocking and
safe to rerun. The agent must not execute or watch it unless the user separately
requests Gitee synchronization.

## Stage 9: Post-release Verification

Verify:

```powershell
gh release view vX.Y.Z --repo leike0813/zotero-agents
gh release view release --repo leike0813/zotero-agents
git ls-remote --tags origin refs/tags/vX.Y.Z
gh release view official-workflows-vCONTENT_PACKAGE_VERSION --repo leike0813/zotero-agents-workflows
npm run check:content-package-release
```

If the user separately ran the optional Gitee command, its successful blocking
exit is the mirror verification result. `npm run check:content-package-mirror`
may be used for an additional read-only content mirror audit, but it is not a
canonical release gate.
