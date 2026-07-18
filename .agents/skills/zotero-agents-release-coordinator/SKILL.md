---
name: zotero-agents-release-coordinator
description: Coordinate the zotero-agents project release workflow. Use when preparing, auditing, executing, recovering, or verifying a Zotero Agents release, including SkillRunner runtime feed checks, content package version/feed publishing, Host Bridge release-set requirements, local test/lint gates, GitHub main synchronization, zotero-plugin release execution, tag/release failure recovery, post-release verification, and separately requested Gitee synchronization.
---

# Zotero Agents Release Coordinator

Use this skill from the repository root.

This skill is the release gatekeeper for Zotero Agents. It coordinates local
checks, content feed publication, Host Bridge release-set publication, GitHub
synchronization, plugin release execution, and failed-release recovery. Gitee
publication is a separate, user-run synchronization command and is never a
canonical release gate.

## Runtime Model

- Gate script: `scripts/release-coordinator-gate.ts`
- State source: git refs, `package.json`, `content-package.version.json`, remote
  tags, GitHub release state, and user-confirmed gate evidence
- Read-only references:
  - Read [references/release-playbook.md](references/release-playbook.md) for
    the normal release path.
  - Read [references/failure-recovery.md](references/failure-recovery.md) when
    a release command fails or a target tag/release already exists.
  - Read [references/host-bridge-change-detection.md](references/host-bridge-change-detection.md)
    when the gate reports Host Bridge changes.

## Gate Discipline

1. Start every release task by running the gate.
2. Execute only the next stage allowed by the gate and the user.
3. After any state-changing action, rerun the gate.
4. Stop when the gate reports blockers that require user authorization.
5. Never rerun `npm run release -- vX.Y.Z` until tag, release, version, and
   remote state have been audited.

Minimal gate command:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z
```

Pass evidence only after the command really passed in this session or the user
explicitly accepted earlier evidence:

```powershell
npm exec -- tsx scripts/release-coordinator-gate.ts --target vX.Y.Z --test-node-full-passed --lint-check-passed --content-package-release-verified
```

## Valid Next Actions

| `next_action` | Meaning | Agent responsibility |
| --- | --- | --- |
| `resolve_blockers` | The working tree, branch, version, or remote state blocks release. | Report blockers and ask for the smallest required decision. |
| `run_host_bridge_pipeline` | Host Bridge surfaces or CLI/package/profile paths changed. | Use `$host-bridge-release-pipeline`. Pass `--host-bridge-done` only after the same `releaseSetId` has a verified complete receipt. |
| `publish_content_package` | Content package or feed-adjacent files changed and release verification evidence is missing. | Follow the content package stage in the playbook, then rerun with verification flags. |
| `run_local_gates` | Required local validation evidence is missing. | Run `npm run test:node:full` and `npm run lint:check`; rerun with evidence flags only when they pass. |
| `sync_main_remotes` | `HEAD` is not confirmed on GitHub `main`. | Ask before pushing; push `main` to `origin` after confirmation. |
| `recover_release_state` | The target tag or release already exists, or remote release state is inconsistent. | Read the recovery reference and request explicit approval before any destructive correction. |
| `ready_to_release` | All local pre-release blockers are clear. | Ask for explicit confirmation, then run `npm run release -- vX.Y.Z`. |
| `audit_complete` | No target release version was provided. | Report the audit result and ask for the intended target version if release should proceed. |

## Required Local Gates

Before `ready_to_release`, require:

- `npm run test:node:full`
- `npm run lint:check`
- content package release verification when the gate reports content package
  candidate changes
- a `host-bridge.release-receipt.v1` with `status: complete` for the prepared
  `releaseSetId` when the gate reports Host Bridge candidate changes

Do not treat CI `test:gate:release` as a replacement for local
`test:node:full` or `lint:check`.

## Commands That Require User Confirmation

Ask before running any command that pushes, creates a release, deletes a tag,
deletes a release, reverts a version bump, or reruns a failed release target:

- `git push origin main`
- `npm run release -- vX.Y.Z`
- `npm run sync:gitee-release -- --plugin-version vX.Y.Z --content-version X.Y.Z`
- `git tag -d vX.Y.Z`
- `git push origin :refs/tags/vX.Y.Z`
- `gh release delete vX.Y.Z`
- any command that changes `package.json`, `package-lock.json`, or
  `content-package.version.json`

## Responsibilities

### Must Be Done By LLM

- Interpret whether the requested release scope needs a plugin release, content
  package release, SkillRunner runtime feed update, Host Bridge release, or a
  combination.
- Explain blockers, recovery paths, and risk to the user.
- Decide whether content changes are semantically release-worthy.
- Request confirmation before state-changing release operations.
- Treat GitHub releases, GitHub tags, GitHub `main`, and the GitHub content feed
  as the publication source of truth.
- After canonical publication succeeds, report the optional manual Gitee
  command. Do not run or watch it unless the user separately and explicitly
  requests that command in the current task.
- When separately requested, use `npm run sync:gitee-release`. It reads
  `GITEE_TOKEN` from the repository `.env`, copies the selected plugin and
  content package releases from GitHub, syncs the existing Gitee refs/feed, and
  blocks until verification succeeds or the command fails.

### Must Be Done By Scripts

- Collect branch, dirty tree, changed paths, remote sync, target tag, and release
  state.
- Produce structured blockers and the next action.
- Keep release audit output stable and machine-readable.

### Forbidden

- Do not copy Host Bridge pipeline steps into this skill; invoke
  `$host-bridge-release-pipeline`.
- Do not delete tags, releases, or version commits without explicit user
  approval.
- Do not mark evidence flags passed unless the command passed or the user
  explicitly supplied that evidence.
- Do not use a temporary script to decide semantic release scope.
- Do not inspect Gitee or wait for Gitee while deciding whether the canonical
  release is complete.
- Do not rebuild packages or plugin assets for Gitee; copy immutable GitHub
  release assets.

## Completion Report

When finished, report:

- target plugin version and content package version
- whether SkillRunner runtime feed was checked or updated
- whether Host Bridge publication was required, its `releaseSetId`, and its
  release receipt status
- local validation commands and results
- GitHub main and tag status
- release command result
- optional Gitee synchronization status (`not requested`, `pending manual
  command`, or the separately requested command result)
- post-release verification result
- remaining risks or manual follow-up
