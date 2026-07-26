# Host Bridge CLI Prebuild Operations

## Choose the operation

Use the remote build-only prebuild when one exact source commit needs a seven-platform binary set synchronized into the repository. Use the local command only when a developer needs a binary for the current platform:

```sh
npm run build:local:zotero-bridge-cli
```

The local command does not dispatch GitHub Actions and does not provide seven-platform release evidence.

Use a new remote dispatch only after the user explicitly authorizes the workflow write to the shared `host-bridge-cli-prebuilds` branch. When the exact run ID is already known, require the operator to supply `--resume-run-id`; the script does not discover or select an existing run automatically.

## Arguments and defaults

The remote entry point is:

```sh
npm run prebuild:zotero-bridge-cli -- [options]
```

Supported options:

| Option | Default |
| --- | --- |
| `--repo <owner/name>` | `GITHUB_REPOSITORY`, otherwise `leike0813/zotero-agents` |
| `--ref <branch>` | Current attached branch |
| `--source-sha <sha>` | Current `HEAD` |
| `--resume-run-id <id>` | No value; dispatch a new run |

Both `--name value` and `--name=value` forms are accepted. The source SHA must contain exactly 40 hexadecimal characters. The resume run ID must be a positive integer. The command has no `--help` mode.

Prefer explicit identity arguments for an auditable run:

```sh
npm run prebuild:zotero-bridge-cli -- \
  --repo owner/repository \
  --ref feature-branch \
  --source-sha 0123456789abcdef0123456789abcdef01234567
```

## Pre-dispatch gates

Before a new dispatch or resume, establish all of the following:

- `HEAD` belongs to an attached branch.
- The worktree is clean.
- The branch has a configured upstream.
- The upstream has been fetched.
- Local `HEAD`, the upstream tip, the remote-tracking ref, the requested ref, and `--source-sha` identify the same commit.
- The requested ref is a valid branch ref.
- The source SHA is the complete current `HEAD`.
- The CLI version equals the version recorded by the release manifest.
- The current build fingerprint equals the locked release-manifest fingerprint.

The script enforces these gates. Inspect failures and stop; do not modify repository state as an implicit part of the prebuild operation.

## New dispatch

A new run:

1. Creates a unique `hbcp-<uuid>` request ID.
2. Dispatches `.github/workflows/build-host-bridge-cli-prebuilds.yml` with the target ref, full source SHA, and request ID.
3. Resolves the run by workflow, `workflow_dispatch` event, run name, request ID, head branch, and head SHA.
4. Excludes runs that already existed before dispatch.
5. Watches only the resolved run.

The expected run name is:

```text
Host Bridge CLI prebuild <request-id>
```

Never use the most recent workflow run as evidence for the current request.

## Resume an existing run

Use the original identity and known run ID:

```sh
npm run prebuild:zotero-bridge-cli -- \
  --repo owner/repository \
  --ref feature-branch \
  --source-sha 0123456789abcdef0123456789abcdef01234567 \
  --resume-run-id 123456789
```

Resume mode does not dispatch. It loads the specified run, validates the workflow path, event, ref, source SHA, and request ID encoded by the run title, then continues watch, artifact download, identity validation, synchronization, and freshness verification.

When observation is interrupted, retain the run ID printed by the script. Redispatch is not a recovery mechanism for watch or download interruption.

## Result identity

The workflow artifact is named:

```text
host-bridge-cli-prebuild-result
```

The orchestration script downloads its JSON document to:

```text
.scaffold/host-bridge-cli-prebuild-results/<run-id>/
└── host-bridge-cli-prebuild-result.json
```

The JSON document uses schema:

```text
host-bridge-cli-prebuild-result.v1
```

It binds:

- `repository`
- `workflow`
- `runId`
- `requestId`
- `sourceSha`
- `ref`
- `cliVersion`
- `buildFingerprint`
- `binaryAggregateSha256`
- `prebuildBranch`
- `prebuildCommit`
- `setPath`

Require:

```text
setPath == sets/<binaryAggregateSha256>
```

The artifact identity, resolved run, requested inputs, and remote content-addressed set must agree exactly.

## Synchronization

The orchestration command passes the downloaded result document to the synchronization script as the explicit identity source. The standalone synchronization interface is:

```sh
npm run sync:host-bridge-cli-prebuilds -- \
  --repo owner/repository \
  --branch host-bridge-cli-prebuilds \
  --aggregate <64-hex-aggregate> \
  --identity-file <result.json>
```

The result document selects the remote immutable set; a stale aggregate in a local manifest must not select another set.

Before replacement, synchronization validates:

- the exact prebuild branch commit;
- `sets/<aggregate>/manifest.json`;
- exactly seven platform archives;
- archive names and SHA-256 values;
- CLI version and build fingerprint;
- extracted binaries and sidecar checksums;
- agreement between the remote manifest and result identity.

Successful synchronization replaces the seven managed platform binaries and their seven `.sha256` sidecars under `addon/bin`, then updates:

```text
cli/zotero-bridge/release.json
addon/bin/zotero-bridge-release.json
```

It stages downloads under `.scaffold/host-bridge-cli-prebuilds-sync`, prepares the complete replacement in a transaction directory, and backs up existing managed files during replacement. Failure rolls back replaced files. If rollback itself fails, retain and report the recovery backup path.

## Completion gate

The orchestration command reruns:

```sh
npm run check:host-bridge-cli-prebuild-freshness
```

Completion requires:

- current source fingerprint equals the release-manifest fingerprint;
- binary fingerprint equals the release fingerprint;
- both release manifests agree;
- all seven platform binaries and sidecars exist;
- recorded binary sizes and checksums match the files;
- orchestration reports `ok: true` and freshness reports `ok: true`.

## Failure handling

Stop without local replacement when the workflow fails, the run does not match, the artifact is absent or malformed, identity fields conflict, the prebuild commit differs, the set is incomplete, or an archive checksum fails.

If replacement or manifest recording fails, rely on the synchronization transaction rollback. Report any retained recovery backup instead of attempting ad hoc file repair.

Preserve the known run ID across network, watch, or artifact-download failures. Correct the external condition and resume the same run.

## Publication boundary

This operation does not:

- choose or bump a version;
- commit, push, or merge source changes;
- prepare a Host Bridge release set;
- create a GitHub Release;
- publish minimum-core, Generic, or Hermes surfaces;
- invoke `release:host-bridge:dispatch`;
- trigger Gitee synchronization.

After build-only evidence is fresh, use `$host-bridge-release-pipeline` for a separately authorized formal publication from a clean, synchronized `main`.
