# Host Bridge Lifecycle and Auth

## Overview

Host Bridge is the plugin's embedded HTTP server. It provides a local HTTP API
for the `zotero-bridge` CLI and ACP agents to interact with Zotero: inspecting
the library, submitting workflows, downloading files, and calling capabilities.

By default the server listens on `127.0.0.1` with a random port in the
`26570–26869` range. It supports pinned ports, LAN mode (`0.0.0.0`), and
automatic supervised recovery.

Three modules implement this subsystem:

| Module | File | Role |
|--------|------|------|
| Server | `src/modules/hostBridgeServer.ts` | HTTP server, lifecycle, port strategy, supervisor |
| Protocol | `src/modules/hostBridgeProtocol.ts` | Request/response types, status snapshot shape |
| Auth | `src/modules/hostBridgeAuth.ts` | Session token, master token encryption, authorization |

---

## Service Status

The server tracks its state through `HostBridgeServiceStatus`:

```typescript
// src/modules/hostBridgeProtocol.ts
export type HostBridgeServiceStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";
```

The internal `HostBridgeServerState` (line 66 of `hostBridgeServer.ts`) adds
supervisor flags: `supervised`, `restartCount`, `lastRecoveryReason`,
`controlledShutdown`.

---

## Lifecycle

### Startup Sequence

```
Plugin Startup
  → startHostBridgeSupervisor()
    → supervisorEnabled = true
    → supervisorTimer (30s interval)
    → ensureHostBridgeServer()
      → [guarded by startingPromise]
      → pickStartPort()
      → tryBind(port)
      → listen()
      → state = "running"

Supervisor Tick (every 30s)
  → shouldRecover()?
    → supervisorEnabled && !controlledShutdown
       && status !== "running" && status !== "starting"
  → if true: scheduleHostBridgeRecovery(reason)
    → setTimeout(RECOVERY_DELAY_MS = 1000)
    → ensureHostBridgeServer()
```

### Controlled Shutdown

```
Plugin Shutdown
  → stopHostBridgeSupervisor()
    → supervisorEnabled = false
    → controlledShutdown = true
    → clearRecoveryTimer()
    → clearSupervisorTimer()
    → close socket
    → state = "stopped"

shutdownHostBridgeServer()
  → controlledShutdown = true
  → clearRecoveryTimer()
  → close socket
  → state = "stopped"
```

### Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `ensureHostBridgeServer()` | 1590 | Idempotent start — guarded by `startingPromise` to prevent concurrent launches |
| `shutdownHostBridgeServer()` | 1602 | Controlled stop — sets `controlledShutdown=true` to prevent recovery |
| `restartHostBridgeServer()` | 1615 | shutdown → ensure |
| `startHostBridgeSupervisor()` | 1627 | Enables supervisor + kicks off ensure + starts 30s tick |
| `stopHostBridgeSupervisor()` | 1642 | Disables supervisor, stops timers, closes socket |
| `getHostBridgeServerStatus()` | 1707 | Returns `HostBridgeStatusSnapshot` from current state |

### Supervisor

- `SUPERVISOR_INTERVAL_MS = 30000` — periodic tick created by
  `ensureSupervisorTimer()`.
- `shouldRecover()` returns true when all three conditions hold:
  `supervisorEnabled && !controlledShutdown && status` is not `"running"` or
  `"starting"`.
- `scheduleHostBridgeRecovery(reason)` sets a one-shot `setTimeout` after
  `RECOVERY_DELAY_MS = 1000`, increments `restartCount`, and calls
  `ensureHostBridgeServer()`.
- `restartCount` accumulates across the plugin session and is exposed in the
  status snapshot.

---

## Port Strategy

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `PORT_MIN` | `26570` | Base of the random port range |
| `PORT_SPAN` | `200` | Random range size (ports `26570`–`26869`) |
| `PINNED_PORT_DEFAULT` | `26570` | Default pinned port |
| `PINNED_PORT_MIN` / `MAX` | `1024` / `65535` | Allowed pinned port range |

### Port Modes

`HostBridgePortMode` has three values:

| Mode | Trigger | Behavior |
|------|---------|----------|
| `pinned` | `hostBridgePinPortEnabled=true` | Binds user-configured `hostBridgePinnedPort` |
| `random` | Default | Picks `PORT_MIN + random(0, PORT_SPAN)` and scans sequentially |
| `fallback` | Pinned port conflict | Disables pin pref, falls back to random range |

### Selection Flow

```
startServer()
  → resolve pinPortEnabled (LAN mode forces pinning)
  → if pinned:
      tryBind(pinnedPort)
      → success: portMode = "pinned"
      → fail + LAN mode: error (no fallback for LAN)
      → fail + loopback: disable pin pref, portMode = "fallback"
                          fall through to random
  → random:
      offset = random(0, PORT_SPAN)
      for i in 0..PORT_SPAN-1:
        tryBind(PORT_MIN + (offset + i) % PORT_SPAN)
        → success: bind
      → all failed: state = "error", schedule recovery
```

**LAN mode** (`lanEnabled=true`) binds `0.0.0.0` instead of `127.0.0.1`. When
LAN is enabled, pinned port is automatically forced. If the pinned port cannot
be bound in LAN mode, the server errors immediately — no fallback is attempted.

---

## Status Snapshot

`HostBridgeStatusSnapshot` provides a full diagnostic view:

```typescript
// src/modules/hostBridgeProtocol.ts
export type HostBridgeStatusSnapshot = {
  status: HostBridgeServiceStatus;
  protocol: "host-bridge.v1";
  host: string;
  port: number;
  endpoint: string;
  remoteEndpoint: string;
  advertisedHost: string;
  remoteEndpointUsesPlaceholder: boolean;
  bindMode: HostBridgeBindMode;
  lanEnabled: boolean;
  portMode: HostBridgePortMode;
  pinPortEnabled: boolean;
  pinnedPort: number;
  supervised: boolean;
  restartCount: number;
  lastRecoveryReason: string;
  authRequired: true;
  tokenMasked: string;
  masterTokenConfigured: boolean;
  masterTokenMasked: string;
  masterTokenUpdatedAt: string;
  lastRequestMethod: string;
  lastResponseStatus: number;
  lastError: string;
  requestCount: number;
  updatedAt: string;
};
```

Grouped by concern:

| Category | Fields |
|----------|--------|
| Identity | `status`, `protocol`, `bindMode`, `lanEnabled` |
| Network | `host`, `port`, `endpoint`, `remoteEndpoint`, `advertisedHost`, `remoteEndpointUsesPlaceholder` |
| Port policy | `portMode`, `pinPortEnabled`, `pinnedPort` |
| Supervision | `supervised`, `restartCount`, `lastRecoveryReason` |
| Auth | `authRequired`, `tokenMasked`, `masterTokenConfigured`, `masterTokenMasked`, `masterTokenUpdatedAt` |
| Runtime | `lastRequestMethod`, `lastResponseStatus`, `lastError`, `requestCount`, `updatedAt` |

---

## HTTP API Routes

All routes are under the `/bridge/v1/` prefix.

| Path | Method | Handler | Purpose |
|------|--------|---------|---------|
| `/bridge/v1/health` | GET | `health()` | Returns `HostBridgeHealth` (status, protocol, bindMode, lanEnabled). Bypasses auth. |
| `/bridge/v1/manifest` | GET | `manifest()` | Returns `HostBridgeManifest` (capabilities, workflow control, file downloads, CLI schema) |
| `/bridge/v1/call` | POST | `callCapability()` | Invoke a named capability with input |
| `/bridge/v1/workflows` | GET | `listWorkflows()` | List available workflow manifests |
| `/bridge/v1/workflows/submit` | POST | `submitWorkflow()` | Submit a workflow for execution |
| `/bridge/v1/workflows/runs/{runId}` | GET | `getWorkflowRun()` | Query workflow run status |
| `/bridge/v1/tasks` | GET | `listTasks()` | List task records |
| `/bridge/v1/files/{fileId}` | GET | `downloadFile()` | Download a file by file ID |

Request processing order:
1. Parse HTTP headers and body
2. Verify bridge path prefix (`/bridge/v1/`)
3. Health endpoint bypasses auth
4. All other paths: `isHostBridgeAuthorizationValid()` auth check
5. Body size limit: `MAX_REQUEST_BODY_BYTES = 1MB`

---

## Token Authentication

### Session Token

```typescript
// src/modules/hostBridgeAuth.ts
function generateHostBridgeToken(): string // 24 random bytes → base64
```

The session token is stored in the `hostBridgeToken` preference. It is generated
at plugin startup and can be rotated via `rotateHostBridgeToken()`.

### Master Token

The master token is an optional persistent token encrypted with AES-GCM. It
survives plugin restarts and allows CLI clients to maintain access across
sessions.

```typescript
// Envelope structure (internal)
type HostBridgeMasterTokenEnvelope = {
  schema_id: "host_bridge.master_token";
  schema_version: "1.0.0";
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: 100000;
  salt: string;       // base64, random per rotation
  iv: string;          // base64, random per encryption
  ciphertext: string;  // base64, encrypted token
  created_at: string;
};
```

Key parameters:

| Parameter | Value |
|-----------|-------|
| Cipher | AES-GCM (256-bit) |
| KDF | PBKDF2-SHA256 |
| Iterations | 100,000 |
| Master key storage | Plugin pref (base64, encrypted at rest by Zotero) |

### Authorization Flow

```
isHostBridgeAuthorizationValid(headers, expectedToken?)
  → extract "Authorization: Bearer <token>" header
  → timingSafeEqual(token, expectedToken)
    → match: return true
    → no match: readHostBridgeMasterToken()
      → master token available + timingSafeMatch: return true
      → otherwise: return false
```

### Master Token API

| Function | Returns | Purpose |
|----------|---------|---------|
| `getHostBridgeMasterTokenStatus()` | `{ configured, tokenMasked, updatedAt }` | Check if master token exists |
| `rotateHostBridgeMasterToken()` | `{ token, tokenMasked, rotatedAt }` | Generate new master token (AES-GCM encrypt) |
| `readHostBridgeMasterToken()` | `HostBridgeMasterTokenReadResult` | Decrypt and read the master token |

`HostBridgeMasterTokenReadResult`:

```typescript
export type HostBridgeMasterTokenReadResult =
  | { ok: true; token: string; tokenMasked: string; updatedAt: string }
  | { ok: false; code: "host_bridge_master_token_missing"
           | "host_bridge_master_token_crypto_unavailable"
           | "host_bridge_master_token_decrypt_failed"
    ; message: string };
```

## Imports and Dependencies

The Host Bridge server is integrated into the plugin at
`src/hooks.ts` — `startHostBridgeSupervisor()` is called during
startup initialization, and `stopHostBridgeSupervisor()` during shutdown.
`ensureHostBridgeServer()` and `getHostBridgeServerStatus()` are used by the
preferences UI and the CLI injection system to surface status diagnostics.

## Approval Prompts

When a Host Bridge capability requires user approval (`"zotero-ui-required"`),
the server builds a human-readable prompt via
`buildCapabilityApprovalPrompt(capability, input)` (line 830).

### Dispatcher

```typescript
function buildCapabilityApprovalPrompt(capability, input): { title, summary, detail }
```

Routes by capability name:

| Capability | Prompt Builder |
|------------|---------------|
| `mutation.execute` | `buildMutationApprovalPrompt(input)` |
| `debug.zotero.eval` | `buildDebugZoteroEvalApprovalPrompt(input)` |
| Any other | Generic "Approve Host Bridge action?" with capability name and summary |

### Mutation Approval Prompts

`buildMutationApprovalPrompt(input)` (line 664) dispatches by
`input.operation`:

| Operation | Title | Summary/Detail |
|-----------|-------|----------------|
| `item.addTags` / `item.removeTags` | "Zotero tag change" | Tag count and preview |
| `item.updateFields` | "Item update" | Field names preview |
| `note.createChild` | "Note creation" | — |
| `note.update` | "Note update" | — |
| `note.upsertPayload` | "Note payload update" | Payload type |
| `collection.addItems` / `collection.removeItems` | "Collection change" | — |
| `literature.ingest` | "Literature ingest" | Paper title, identifiers, PDF URL status |
| Other | "Approve Zotero write action?" | Raw operation name and target count |

All mutation prompts include `"Source: zotero-bridge CLI."` in the detail
field.

### Debug Eval Approval Prompt

`buildDebugZoteroEvalApprovalPrompt(input)` (line 814):

- Title: `"Approve Zotero debug eval?"`
- Detail includes risk warning:
  `"Risk: this code can read or modify Zotero state depending on what it does."`
- `input.code` is truncated to 500 characters via `compactApprovalText()`.

### Truncation Helper

`compactApprovalText(value, limit)` (line 806) truncates a string to `limit`
characters, appending `...[truncated]` when the source exceeds the limit.
