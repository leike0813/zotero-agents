# Harden Git Sync Worktree Isolation

## Why

In direct/dev launches, the plugin can fall back to the process cwd when Zotero data-dir and runtime-root environment data are unavailable. Git Sync then may receive a worktree path inside the project repository. The Git command adapter currently initializes any supplied path and rewrites `origin`, so a misresolved worktree can mutate and push the development repository.

## What Changes

- Put the Git Sync worktree under the runtime root's `runtime/synthesis/git-sync-worktree` directory.
- Require a Git Sync sentinel file before reusing any existing Git worktree.
- Reject worktrees that are an existing non-managed Git repo or nested inside a parent Git repo.
- Refuse to remove or rewrite remotes until the sentinel guard passes.
- Make `start:direct` provide a project-external default `ZOTERO_SKILLS_RUNTIME_ROOT`.
- Add focused tests for unsafe repo rejection, sentinel mismatch, safe managed worktrees, and direct runtime env.

## Non-Goals

- Do not support user-managed arbitrary Git worktrees.
- Do not change Git Sync remote configuration semantics.
- Do not rewrite Git history or clean already affected remote test repositories.
