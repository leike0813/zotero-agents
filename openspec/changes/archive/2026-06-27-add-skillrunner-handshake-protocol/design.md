# Design: SkillRunner Handshake Protocol

## Endpoint

SkillRunner backends expose:

```http
POST /v1/system/handshake
```

Request:

```json
{
  "schema": "zotero-agents.skillrunner-handshake.request.v1",
  "client": {
    "name": "zotero-agents",
    "version": "0.5.4"
  },
  "requested_protocols": [
    "skillrunner.job.v1",
    "skillrunner.sequence.v1"
  ]
}
```

Response:

```json
{
  "schema": "zotero-agents.skillrunner-handshake.response.v1",
  "backend": {
    "name": "Skill-Runner",
    "version": "0.7.3"
  },
  "protocols": {
    "skillrunner.job.v1": { "supported": true },
    "skillrunner.sequence.v1": { "supported": false }
  }
}
```

## Protocol IDs

Protocol IDs are stable contract identifiers:

- `skillrunner.job.v1`: existing single SkillRunner job request.
- `skillrunner.sequence.v1`: sequence workflow protocol, matching plugin workflow declarations.

New protocol semantics require a new ID. Existing IDs are not reused with changed meaning.

## Capability Resolution

The plugin requests the known protocol IDs from the backend handshake endpoint and normalizes the response into a capability object:

- `source`: `remote` or `legacy-fallback`.
- `backend`: optional backend name and version.
- `protocols`: supported boolean by protocol ID.

The resolver caches the promise by:

```text
backend.id + "\n" + backend.baseUrl
```

This avoids repeating the handshake during a run while ensuring backend identity or URL changes trigger a new handshake.

## Legacy Fallback

If the handshake request returns `404` or `405`, the resolver probes `/v1/system/ping` with GET fallback allowed. If the backend is reachable, it returns legacy capabilities:

```json
{
  "skillrunner.job.v1": { "supported": true },
  "skillrunner.sequence.v1": { "supported": false }
}
```

Authentication failures, network failures, and other HTTP failures do not become legacy capabilities. They remain backend availability or configuration failures.

## Execution Preflight

Before sending a SkillRunner request through the provider, the plugin resolves backend capabilities and checks the protocol required by the current execution path:

- `skillrunner.job.v1` request requires `skillrunner.job.v1`.
- Current `skillrunner.sequence.v1` execution on SkillRunner decomposes into step jobs, so it requires `skillrunner.job.v1`.
- A future backend-native sequence path uses the same `skillrunner.sequence.v1` ID and requires `skillrunner.sequence.v1`.

If the required protocol is unsupported, execution fails during preparation with a clear compatibility error.

## Logging

The provider records the handshake source, backend version, and supported protocol IDs in runtime logs. Normal execution UI does not ask users to choose a protocol.
