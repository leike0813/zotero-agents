---
name: host-bridge-cli-prebuild
description: Run or resume the exact seven-platform Host Bridge CLI build-only prebuild workflow, synchronize its content-addressed binaries and release manifests, and verify local freshness. Use when a pushed development-branch CLI identity needs reproducible prebuild evidence before formal Host Bridge release preparation, or when an interrupted prebuild run must be recovered without redispatch.
---

# Host Bridge CLI Prebuild

## Goal

Produce and synchronize one exact seven-platform Host Bridge CLI prebuild set for the current locked source identity. This workflow is build-only: it does not choose or bump versions, prepare a release set, publish Host Bridge surfaces, commit or push source changes, merge branches, or synchronize Gitee.

## Inputs

- An attached, clean branch with a configured upstream.
- A pushed `HEAD` equal to the upstream tip.
- A CLI version and build fingerprint already locked in the release manifest.
- The target GitHub repository, branch ref, and full 40-character source SHA.
- Explicit user authorization for a new dispatch, because the workflow writes the shared `host-bridge-cli-prebuilds` branch.
- For recovery, the exact existing GitHub Actions run ID.

## Workflow

1. Read [prebuild operations](references/prebuild-operations.md) before running or resuming the workflow.
2. Classify the request:
   - Use `npm run build:local:zotero-bridge-cli` only for a current-platform developer binary.
   - Use a new prebuild dispatch for an exact seven-platform set when the user has explicitly authorized the shared-branch write.
   - Use `--resume-run-id` when a known run was already dispatched and observation, artifact download, or local synchronization was interrupted.
3. Inspect the current branch, worktree, upstream, `HEAD`, requested ref, requested source SHA, CLI version, and build fingerprint. Do not mutate, commit, push, merge, or bump anything to make a failed gate pass.
4. Prefer explicit `--repo`, `--ref`, and `--source-sha` arguments even though the script has defaults. Record those values before dispatch.
5. For a new run, execute `npm run prebuild:zotero-bridge-cli` exactly once. Do not dispatch until the current request contains explicit authorization for the remote side effect.
6. For recovery, execute the same command with the original repository, ref, source SHA, and `--resume-run-id`. Never create a replacement run merely because watch or download failed.
7. Require the exact workflow run and the result artifact whose JSON document uses schema `host-bridge-cli-prebuild-result.v1` to prove the request ID, source identity, CLI identity, aggregate, prebuild commit, and immutable set path before local synchronization.
8. Require transactional synchronization of all seven binaries, sidecar checksums, and both release manifests. Finish only when `npm run check:host-bridge-cli-prebuild-freshness` passes.
9. If formal Host Bridge publication is requested after the build-only evidence is complete, hand control to `$host-bridge-release-pipeline`. Do not continue into release preparation or dispatch under this Skill.

## Hard Constraints

- The source SHA must be the full current `HEAD` and must equal the upstream tip and requested branch ref.
- The CLI version and build fingerprint must already be locked; this Skill never selects or bumps them.
- Match a new run by its unique request ID and source identity. Never select the latest workflow run as a substitute.
- Resume only the specified run ID and validate its workflow, event, ref, SHA, request ID, result artifact, and immutable set identity.
- Treat version, fingerprint, aggregate, set path, prebuild commit, archive, or checksum mismatches as terminal for the current synchronization attempt.
- Do not replace managed local files until all remote identity and archive checks have passed.
- Do not use a local single-platform build as seven-platform release evidence.
- Do not invoke `prepare:host-bridge-release`, `release:host-bridge:dispatch`, GitHub Release creation, or Gitee synchronization.
- Do not treat an ordinary `main` push as publication authorization.
- Do not use `--help`; the current prebuild command rejects unsupported arguments.

## Completion

Report:

- repository, ref, and full source SHA;
- CLI version and build fingerprint;
- request ID and workflow run ID;
- result artifact schema;
- aggregate SHA-256, prebuild branch commit, and `sets/<aggregate>` path;
- seven-platform synchronization status;
- both release-manifest update status;
- freshness gate result.

If the run or synchronization fails, preserve and report the exact run ID, identity evidence, failure stage, and any recovery backup path. Provide the exact resume command when the same run can continue.

## Reference

Read [prebuild operations](references/prebuild-operations.md) for command forms, defaults, gates, result fields, synchronization behavior, and recovery rules.
