# Failure Recovery

Use this reference when a release command fails, the target tag exists, a
release exists for the target, or Gitee synchronization fails.

## Recovery Discipline

1. Stop immediately after a failed release command.
2. Run the gate for the same target version.
3. Inspect local tag, GitHub tag, Gitee tag, GitHub release, working tree, and
   package version state.
4. Present the smallest recovery plan to the user.
5. Execute destructive recovery commands only after explicit approval.

## Audit Commands

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z
git status --short --branch
git tag --list vX.Y.Z
git ls-remote --tags origin refs/tags/vX.Y.Z
git ls-remote --tags gitee refs/tags/vX.Y.Z
gh release view vX.Y.Z --repo leike0813/zotero-agents
```

## Recovery Cases

### Version Bump Exists But Tag Is Missing

Use when `package.json` or `package-lock.json` already contains the target
version, but the target tag was not created or pushed.

Recommended action:

- Confirm whether the bump commit should be kept.
- If keeping it, do not rerun the same release target until tag state is clear.
- If reverting it, ask before reverting the bump commit or editing version files.

### Local Tag Exists But Remote Tags Are Missing

Use when the local tag exists and no remote release was created.

Possible action after approval:

```powershell
git tag -d vX.Y.Z
```

Then rerun the gate before retrying the release.

### Remote Tag Exists

Use when `origin` or `gitee` already has `refs/tags/vX.Y.Z`.

Possible action after approval:

```powershell
git push origin :refs/tags/vX.Y.Z
git push gitee :refs/tags/vX.Y.Z
```

Only delete a remote tag when the corresponding release is known to be failed
or intentionally abandoned.

### GitHub Release Exists

Use when `gh release view vX.Y.Z` succeeds.

Possible action after approval:

```powershell
gh release delete vX.Y.Z --repo leike0813/zotero-agents
```

If the release has valid assets and update metadata, prefer post-release
verification over deletion.

### Gitee Synchronization Failed

Use when the GitHub release succeeded but the release workflow did not complete
Gitee sync.

Recommended action:

- Verify GitHub release and `release` update manifest first.
- Inspect the failed GitHub Actions job logs.
- Prefer rerunning the failed workflow job when available.
- Use project sync scripts only when the target GitHub release is already valid.

## Do Not Attempt

- Do not run `npm run release -- vX.Y.Z` again while the target tag or release
  exists.
- Do not delete both local and remote tags without first checking whether the
  GitHub release is valid.
- Do not edit version files manually unless the user explicitly chooses a
  version correction path.
