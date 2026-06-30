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
After the Host Bridge pipeline is complete, rerun:

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
npm run check:content-package-mirror
```

Rerun the gate with content package evidence only when verification passes:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --content-package-release-verified --content-package-mirror-verified
```

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
`HEAD` is available on both remotes.

Ask before pushing:

```powershell
git push origin main
git push gitee main
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
- target tag is not present locally, on GitHub, or on Gitee
- `HEAD` is synced to GitHub and Gitee `main`

## Stage 8: Post-release Verification

Verify:

```powershell
gh release view vX.Y.Z --repo leike0813/zotero-agents
gh release view release --repo leike0813/zotero-agents
git ls-remote --tags origin refs/tags/vX.Y.Z
git ls-remote --tags gitee refs/tags/vX.Y.Z
npm run check:content-package-release
```

If mirror publication is part of the release, also run:

```powershell
npm run check:content-package-mirror
```
