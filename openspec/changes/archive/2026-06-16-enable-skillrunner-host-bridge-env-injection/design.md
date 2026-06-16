# Design

## CLI Resolution

`BridgeConfig::load()` resolves endpoint as:

1. `--endpoint`
2. `ZOTERO_BRIDGE_ENDPOINT`
3. `profile.endpoint`

Profile parsing accepts `connectionMode` for local/remote declaration. v1 reads
the field for compatibility but does not use it for authorization decisions.

## SkillRunner Request Preparation

SkillRunner request preparation remains plugin-owned:

1. Build workflow requests as before.
2. Resolve execution context.
3. If the target is `skillrunner.job.v1`, the workflow requires Host Bridge
   access, and the native SkillRunner option switch remains false:
   - build remote Host Bridge env from current server status;
   - merge it into `runtime_options.env`;
   - remove `runtime_options.zotero_host_access`.

Existing env entries are preserved, except Host Bridge env names are overwritten
by the current plugin runtime.

## Remote Endpoint Guard

The env builder only returns success when Host Bridge status proves a usable LAN
endpoint:

- LAN bind mode is enabled.
- Pinned port is active and available.
- `advertisedHost` is concrete and not placeholder, loopback, or wildcard.
- `remoteEndpoint` includes `/bridge/v1`.
- A current Host Bridge token is available.

Failures stop preparation before the SkillRunner request is submitted.

## Profile Modes

Local ACP workspace and well-known profiles are written with
`connectionMode: "local"`. Remote copied/template profiles use
`connectionMode: "remote"`.
