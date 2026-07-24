# Release-Set Operations

## Content review and gates

Run the semantic review when its collector returns `reviewRequired: true`. Then use the unified Host Bridge renderer and content gate exposed by `package.json`, followed by:

```sh
npm run check:host-bridge-doc-sync
npx tsx scripts/check-host-bridge-skill-packages.ts <minimum-core-root> <generic-root> <generic-task-root> <hermes-root>
npm run check:host-bridge-review-mirror
```

Derive these roots from `host-bridge/surfaces.json`; include `skills/zotero-library-agent` and all five task Skills beneath the Generic source root. The manifest resolver determines inherited components and materialization mounts.

After any governed Markdown semantic change, run `$host-bridge-review-mirror` before the final check. The mirror translates each owned source once and records effective inheritance in its index and v2 provenance. This is a local Agent gate; it does not add an automatic CI or push-triggered publication path.

## Version and prebuild decisions

Read the accumulated plan:

```sh
npm run release:host-bridge:plan
```

The CLI release supplies the major.minor line. Each surface's own `patch` comes from the manifest. A CLI patch or inherited component digest may change an exact release set without changing a downstream surface patch. Let the plan classify source changes; do not manually infer a bump from generated drift.

When `prebuildRequired` is true, dispatch `build-host-bridge-cli-prebuilds.yml`, synchronize its exact aggregate from `host-bridge-cli-prebuilds`, and record it before preparing. When it is false, run:

```sh
npm run check:host-bridge-cli-prebuild-freshness
```

### Build-only development prebuilds

Before dispatch, lock the CLI identity in `cli/zotero-bridge/release.json`: its version must equal the Cargo package version and its build fingerprint must equal the current fingerprint. Keep the branch attached and clean, configure an upstream, push the exact source commit, and require the local `HEAD`, upstream tip, requested ref, and full `--source-sha` to identify the same commit.

Run the seven-platform build and synchronization path with explicit evidence:

```sh
npm run prebuild:zotero-bridge-cli -- \
  --repo owner/repository \
  --ref feature-branch \
  --source-sha 0123456789abcdef0123456789abcdef01234567
```

This command dispatches the build-only workflow with a unique request id, watches the exactly matched run, downloads `host-bridge-cli-prebuild-result.v1`, validates its source SHA, version, fingerprint, aggregate, prebuild commit, and `sets/<aggregate>` path, stages and verifies all seven archives, replaces the managed binaries and two release manifests transactionally, and reruns `npm run check:host-bridge-cli-prebuild-freshness`. A stale local aggregate does not select the remote set; the structured result is the synchronization identity.

If observation was interrupted after dispatch, resume the known run without creating another:

```sh
npm run prebuild:zotero-bridge-cli -- \
  --repo owner/repository \
  --ref feature-branch \
  --source-sha 0123456789abcdef0123456789abcdef01234567 \
  --resume-run-id 123456789
```

Resume is valid only when the run and result artifact prove the same repository, workflow, request id, ref, source SHA, CLI identity, immutable set, and prebuild-branch commit. A failed workflow, missing artifact, malformed identity, incomplete archive set, or checksum conflict stops before managed local files are replaced. Retain the run id and correct the failed external condition; do not guess from the latest run or redispatch merely to obtain a different identity.

For one current-platform developer binary, use `npm run build:local:zotero-bridge-cli`; that command does not dispatch GitHub Actions. Neither local building nor development-branch prebuilding prepares a release set, publishes Host Bridge surfaces, commits or pushes repository changes, or invokes Gitee. Formal publication remains a separate clean synchronized `main` procedure with an exact prepared release set and explicit `release:host-bridge:dispatch` authorization.

## Preparation, dispatch, and recovery

Prepare once:

```sh
npm run prepare:host-bridge-release
npm run prepare:host-bridge-release -- --cli-version X.Y.Z
```

Use an exact target when one is approved. Use `--intent minor` only for an approved protocol or schema-line change without an exact target. Commit and push the prepared sources before dispatch.

Dispatch the exact release set only after explicit authorization:

```sh
npm run release:host-bridge:dispatch -- --release-set-id hbrs-... --watch
```

If finalization reports concurrent Host changes, use the workflow's uploaded finalize artifact to resume this release set. Completion requires verified immutable surfaces, advanced mutable pointers, source-main finalization, and a complete v2 receipt. Gitee is outside this procedure.
