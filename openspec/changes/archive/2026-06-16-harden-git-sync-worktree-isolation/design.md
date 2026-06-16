# Design: Git Sync Worktree Isolation

## Worktree Placement

Git Sync worktree paths are derived from the plugin runtime root only:

`<runtimeRoot>/runtime/synthesis/git-sync-worktree`

The service no longer places the worktree next to `data/synthesis` or under an arbitrary caller root.

## Sentinel

The adapter manages `.zotero-skills-git-sync-worktree.json` at the worktree root. It records schema id/version, source marker, remote URL, and branch. A matching sentinel is required before reusing an existing Git repository. If a `.git` directory or parent Git repository is found without a matching sentinel, Git Sync fails before `git init`, `remote remove`, `remote add`, `commit`, or `push`.

## Guard Flow

Before repository initialization:

1. Ensure the target directory exists.
2. Run `git rev-parse --show-toplevel` in the target directory with failure allowed.
3. If Git reports a parent repository whose top-level is not the worktree root, reject with `git_sync_worktree_unsafe_parent_repo`.
4. If Git reports the worktree itself as a repository but the sentinel is missing, reject with `git_sync_worktree_sentinel_missing`.
5. If the sentinel exists but does not match the configured remote/branch/source, reject with `git_sync_worktree_sentinel_mismatch`.
6. Write or refresh the sentinel, then initialize and configure the managed repo.

## Direct Launcher

`start:direct` passes `ZOTERO_SKILLS_RUNTIME_ROOT` to Zotero. If the caller has not set it, the launcher resolves a project-external default under local app data or the OS temp directory.
