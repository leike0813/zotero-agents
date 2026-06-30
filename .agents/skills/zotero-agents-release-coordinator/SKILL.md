---
name: zotero-agents-release-coordinator
description: Coordinate the zotero-agents project release workflow. Use when preparing, auditing, executing, recovering, or verifying a Zotero Agents release, including SkillRunner runtime feed checks, content package version/feed publishing, Host Bridge CLI release requirements, local test/lint gates, GitHub/Gitee main synchronization, zotero-plugin release execution, tag/release failure recovery, and post-release verification.
---

# Zotero Agents Release Coordinator

Use this skill from the repository root:

```powershell
D:\Workspace\Code\JavaScript\zotero-agents
```

This skill is the release gatekeeper for Zotero Agents. It coordinates local
checks, content feed publication, Host Bridge CLI publication, GitHub/Gitee
synchronization, plugin release execution, and failed-release recovery.

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
| `run_host_bridge_pipeline` | Host Bridge surfaces or CLI/package/profile paths changed. | Use `$host-bridge-release-pipeline`, then rerun this gate with `--host-bridge-done` only after it completes. |
| `publish_content_package` | Content package or feed-adjacent files changed and release verification evidence is missing. | Follow the content package stage in the playbook, then rerun with verification flags. |
| `run_local_gates` | Required local validation evidence is missing. | Run `npm run test:node:full` and `npm run lint:check`; rerun with evidence flags only when they pass. |
| `sync_main_remotes` | `HEAD` is not confirmed on both GitHub and Gitee `main`. | Ask before pushing; push `main` to both remotes after confirmation. |
| `recover_release_state` | The target tag or release already exists, or remote release state is inconsistent. | Read the recovery reference and request explicit approval before any destructive correction. |
| `ready_to_release` | All local pre-release blockers are clear. | Ask for explicit confirmation, then run `npm run release -- vX.Y.Z`. |
| `audit_complete` | No target release version was provided. | Report the audit result and ask for the intended target version if release should proceed. |

## Required Local Gates

Before `ready_to_release`, require:

- `npm run test:node:full`
- `npm run lint:check`
- content package release verification when the gate reports content package
  candidate changes
- Host Bridge release pipeline completion when the gate reports Host Bridge
  candidate changes

Do not treat CI `test:gate:release` as a replacement for local
`test:node:full` or `lint:check`.

## Commands That Require User Confirmation

Ask before running any command that pushes, creates a release, deletes a tag,
deletes a release, reverts a version bump, or reruns a failed release target:

- `git push origin main`
- `git push gitee main`
- `npm run release -- vX.Y.Z`
- `git tag -d vX.Y.Z`
- `git push origin :refs/tags/vX.Y.Z`
- `git push gitee :refs/tags/vX.Y.Z`
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

## Completion Report

When finished, report:

- target plugin version and content package version
- whether SkillRunner runtime feed was checked or updated
- whether Host Bridge pipeline was required and completed
- local validation commands and results
- GitHub/Gitee main and tag status
- release command result
- post-release verification result
- remaining risks or manual follow-up
