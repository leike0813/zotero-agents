# Design

## Runtime Feed
The feed schema is intentionally small:

```json
{
  "schema": "zotero-agents.skillrunner-runtime-feed.v1",
  "revision": "2026-06-30-001",
  "updated_at": "2026-06-30T00:00:00Z",
  "matches": [
    {
      "plugin": ">=0.5.0 <0.6.0",
      "skillrunner": "v0.7.3"
    }
  ]
}
```

The resolver reads the current plugin version, finds the first `matches[]` entry whose `plugin` range is satisfied, and returns its `skillrunner` tag. The default primary URL is GitHub raw; the fallback URL is the Gitee raw URL. Gitee is only requested when GitHub fails or has no compatible match.

## Resolution Order
Managed local runtime version resolution uses this order:

1. Explicit hidden override from `skillRunnerLocalRuntimeVersion` or a direct function argument.
2. Primary remote feed.
3. Fallback remote feed.
4. Last successful feed cache.
5. Embedded fallback feed bundled with the plugin.

Only successful remote feed resolutions update `skillRunnerRuntimeFeedCacheJson`. The cache stores the source URL, fetch timestamp, and normalized feed document.

## Local Runtime Integration
One-click planning and deployment resolve the target version before deciding whether to start or deploy. Existing runtime info is reusable only when `state.versionTag` equals the resolved target version. Missing runtime info, missing install dir, preflight failure, or version mismatch selects deploy.

The ordinary UI remains unchanged: users see the existing prepare/start progress and failure messages, not feed source or version selection details.

## Feed Update Script
`scripts/update-skillrunner-runtime-feed.ts` updates `artifact/skillrunner-runtime-feed/feed.json` by default. It accepts:

```shell
tsx scripts/update-skillrunner-runtime-feed.ts --plugin ">=0.5.0 <0.6.0" --skillrunner v0.7.3
```

If the plugin range already exists, the script replaces its SkillRunner tag. Otherwise it appends a new match. It updates `revision` and `updated_at`, sorts matches by plugin range, and writes stable UTF-8 JSON. Publishing copies the same `feed.json` to the `skillrunner-runtime-feed` branch on GitHub and Gitee.
