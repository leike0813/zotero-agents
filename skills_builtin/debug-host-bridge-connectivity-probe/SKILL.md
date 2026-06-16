---
name: debug-host-bridge-connectivity-probe
description: Debug-only Host Bridge connectivity probe for validating CLI injection, endpoint reachability, authentication, and read-only capability routing.
---

# Debug Host Bridge Connectivity Probe

This skill is only for Zotero Skills debug workflows. Do not write Zotero
items, notes, preferences, or external files except `result/result.json` under
the current working directory. Use the current working directory as the run
workspace.

Read `parameter.probeDepth` and `parameter.expectedConnectionMode` from the run
prompt. Defaults are `capability` and `auto`.

## Probe Steps

1. Resolve the CLI entry:
   - Windows: prefer `.zotero-bridge\bin\zotero-bridge.cmd`, then
     `.zotero-bridge\bin\zotero-bridge.exe`, then `zotero-bridge`.
   - POSIX: prefer `./.zotero-bridge/bin/zotero-bridge`, then
     `zotero-bridge`.
2. Inspect environment and profile without printing tokens:
   - Record whether `ZOTERO_BRIDGE_PROFILE` exists.
   - Record whether `ZOTERO_BRIDGE_ENDPOINT` exists.
   - Record whether `ZOTERO_BRIDGE_TOKEN` exists.
   - If the profile path exists, read JSON fields `endpoint`,
     `connectionMode`, `auth.type`, and `auth.tokenEnv`. Do not record
     `auth.token`.
3. Determine `endpoint_source`:
   - `env` if `ZOTERO_BRIDGE_ENDPOINT` is non-empty.
   - `profile` if profile `endpoint` is non-empty.
   - `unknown` otherwise.
4. If `expectedConnectionMode` is `local`, fail when the resolved endpoint or
   profile `connectionMode` is remote.
5. If `expectedConnectionMode` is `remote`, fail when the resolved endpoint is
   loopback, wildcard, empty, or profile `connectionMode` is local.
6. Always run `status` when `probeDepth` is `basic`, `auth`, or `capability`.
7. Run `manifest` when `probeDepth` is `auth` or `capability`.
8. Run `call diagnostic.get_status --input '{}'` when `probeDepth` is
   `capability`.
9. Write `result/result.json` and also output the same JSON object.

Each command result must be recorded as a check object with `id`, `status`,
`duration_ms`, and optional `failure_code`. Use an empty string for
top-level `failure_code` and `failure_message` when the probe succeeds; do not
use `null` in the output. Do not include raw stdout when it may contain
host-specific data; extract only bounded protocol metadata such as protocol,
capability count, and whether a remote endpoint is present.

## Failure Codes

Use these stable failure codes:

- `cli_not_found`
- `profile_missing`
- `endpoint_missing`
- `token_missing`
- `endpoint_unreachable`
- `auth_failed`
- `manifest_invalid`
- `capability_call_failed`
- `expected_local_but_remote`
- `expected_remote_but_local`
- `remote_endpoint_loopback`

## Output

Return JSON matching `assets/output.schema.json`.

Example:

```json
{
  "kind": "host_bridge_connectivity_probe_result",
  "ok": true,
  "connection": {
    "cli_entry": ".zotero-bridge/bin/zotero-bridge",
    "endpoint_source": "env",
    "endpoint": "http://192.0.2.25:27655/bridge/v1",
    "connection_mode": "remote",
    "token_present": true
  },
  "checks": [
    { "id": "cli.resolve", "status": "passed", "duration_ms": 1 },
    { "id": "bridge.status", "status": "passed", "duration_ms": 12 },
    { "id": "bridge.manifest", "status": "passed", "duration_ms": 18 },
    { "id": "bridge.capability_call", "status": "passed", "duration_ms": 21 }
  ],
  "diagnostics": {
    "protocol": "host-bridge.v1",
    "capability_count": 42,
    "remote_endpoint_detected": true
  },
  "failure_code": "",
  "failure_message": ""
}
```
