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
