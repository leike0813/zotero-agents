# Host Bridge Lifecycle and Auth

## Overview

Host Bridge is the plugin's embedded HTTP server. It provides a local HTTP API
for the `zotero-bridge` CLI and ACP agents to interact with Zotero: inspecting
the library, submitting workflows, downloading files, and calling capabilities.

This document covers the embedded server's lifecycle and authorization
boundary. It is not the design source for agent-facing task policy or resident
automation. The three-layer composition and its public Skill contracts are
defined in [Host Bridge Agent-facing Surfaces](host-bridge-agent-surfaces.md).
The Hermes resident service is a separate one-pass CLI client of Host Bridge:
it owns its local `state.sqlite` cache/journal and cron routing, while this
server remains the authoritative HTTP control plane and approval boundary.

By default the server listens on `127.0.0.1` with a random port in the
`26570–26869` range. It supports pinned ports, LAN mode (`0.0.0.0`), and
automatic supervised recovery.

The server is split by ownership rather than by transport endpoint:

| Module | File | Role |
|--------|------|------|
| Server | `src/modules/hostBridge/server/hostBridgeServer.ts` | Listener lifecycle, authorization, admission, operation replay, socket ownership, port strategy, supervisor |
| Request reader | `src/modules/hostBridge/server/hostHttpRequestReader.ts` | Bounded byte reads and strict HTTP request parsing |
| Response writer | `src/modules/hostBridge/server/runtimeHttpResponse.ts` | Memory/file response construction and output transfer |
| Route contract | `src/modules/hostBridge/server/hostBridgeRouteContract.ts` | Private route match descriptor and admission modes |
| Route families | `src/modules/hostBridge/server/routes/hostBridge*Routes.ts` | Diagnostics, capability/context, workflow/activity, file, and Synthesis path ownership; each route family owns matching, method validation, request parsing, downstream dispatch, and error mapping for its routes |
| Protocol | `src/modules/hostBridge/server/hostBridgeProtocol.ts` | Request/response types, status snapshot shape |
| Auth | `src/modules/hostBridge/server/hostBridgeAuth.ts` | Session token, master token encryption, authorization |

---

## Service Status

The server tracks its state through `HostBridgeServiceStatus`:

```typescript
// src/modules/hostBridge/server/hostBridgeProtocol.ts
export type HostBridgeServiceStatus =
  | "idle"
  | "starting"
  | "running"
  | "error"
  | "stopped";
```

The internal `HostBridgeServerState` adds
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

| Function | Purpose |
|----------|---------|
| `ensureHostBridgeServer()` | Idempotent start — guarded by `startingPromise` to prevent concurrent launches |
| `shutdownHostBridgeServer()` | Controlled stop — sets `controlledShutdown=true` to prevent recovery |
| `restartHostBridgeServer()` | shutdown → ensure |
| `startHostBridgeSupervisor()` | Enables supervisor + kicks off ensure + starts 30s tick |
| `stopHostBridgeSupervisor()` | Disables supervisor, stops timers, closes socket |
| `getHostBridgeServerStatus()` | Returns `HostBridgeStatusSnapshot` from current state |

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
// src/modules/hostBridge/server/hostBridgeProtocol.ts
export type HostBridgeStatusSnapshot = {
  status: HostBridgeServiceStatus;
  protocol: "host-bridge.v2";
  host: string;
  port: number;
  endpoint: string;
  remoteEndpoint: string;
  advertisedHost: string;
  advertisedHostSource?: "manual" | "auto" | "placeholder";
  advertisedHostDiagnostics?: string[];
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
| Network | `host`, `port`, `endpoint`, `remoteEndpoint`, `advertisedHost`, `advertisedHostSource`, `advertisedHostDiagnostics`, `remoteEndpointUsesPlaceholder` |
| Port policy | `portMode`, `pinPortEnabled`, `pinnedPort` |
| Supervision | `supervised`, `restartCount`, `lastRecoveryReason` |
| Auth | `authRequired`, `tokenMasked`, `masterTokenConfigured`, `masterTokenMasked`, `masterTokenUpdatedAt` |
| Runtime | `lastRequestMethod`, `lastResponseStatus`, `lastError`, `requestCount`, `updatedAt` |

---

## HTTP API Routes

All routes are under the `/bridge/v2/` prefix.

| Path | Method | Handler | Purpose |
|------|--------|---------|---------|
| `/bridge/v2/health` | GET | `health()` | Returns `HostBridgeHealth` (status, protocol, bindMode, lanEnabled). Bypasses auth. |
| `/bridge/v2/manifest` | GET | `manifest()` | Returns `HostBridgeManifest` (capabilities, workflow control, file downloads, CLI schema) |
| `/bridge/v2/call` | POST | `callCapability()` | Invoke a named capability with input |
| `/bridge/v2/workflows` | GET | `listWorkflows()` | List available workflow manifests |
| `/bridge/v2/workflows/submit` | POST | `submitWorkflow()` | Submit a workflow for execution |
| `/bridge/v2/workflows/agent-runs/{agentRunId}/apply` | GET, POST | workflow/activity route | Read or apply an agent-run result |
| `/bridge/v2/workflows/agent-runs/{agentRunId}/renew` | POST | workflow/activity route | Renew an unconsumed agent run |
| `/bridge/v2/workflows/agent-runs/{agentRunId}/abandon` | POST | workflow/activity route | Abandon an unconsumed agent run |
| `/bridge/v2/workflows/runs/{workflowRunId}` | GET | `getWorkflowRun()` | Query workflow run status |
| `/bridge/v2/workflows/runs/{workflowRunId}/cancel` | POST | `cancelWorkflowRun()` | Request workflow run cancellation |
| `/bridge/v2/tasks` | GET | `listTasks()` | List task records |
| `/bridge/v2/tasks/active` | GET | `listActiveTasks()` | List lightweight active task records |
| `/bridge/v2/skill-runs/{skillRunId}` | GET | `getSkillRun()` | Query one skill run status |
| `/bridge/v2/skill-runs/{skillRunId}/reply` | POST | `replySkillRun()` | Reply to a waiting skill run |
| `/bridge/v2/skill-runs/{skillRunId}/connect` | POST | `connectSkillRun()` | Connect to a recoverable skill run |
| `/bridge/v2/files/{fileId}` | GET | `downloadFile()` | Download a file by file ID |
| `/bridge/v2/files/upload` | POST | file route | Register one bounded upload as an opaque file handle |
| `/bridge/v2/synthesis/cache/status` | GET | Synthesis route | Read cache or maintenance-operation status |
| `/bridge/v2/synthesis/cache/invalidate` | POST | Synthesis route | Request approved cache invalidation |
| `/bridge/v2/synthesis/index/status` | GET | Synthesis route | Read index availability |

Request processing order:

1. Read bounded bytes and strictly parse the HTTP request.
2. Dispatch `/mcp`; otherwise verify the `/bridge/v2/` prefix.
3. Serve `GET /bridge/v2/health` before authorization.
4. Authorize every other Host Bridge route and enforce its body limit.
5. Match one private route descriptor. The descriptor is the single source for
   `read`, `generic-operation`, or `canonical-mutation` admission.
6. Reserve/replay generic operations when required, invoke the matched handler,
   then complete or mark the operation outcome unknown.

Every non-GET route marked `generic-operation` requires
`X-Zotero-Bridge-Operation-Id`. Canonical mutation capabilities retain their
own durable mutation authority instead of entering the generic operation store.

---

## Token Authentication

### Session Token

```typescript
// src/modules/hostBridge/server/hostBridgeAuth.ts
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
`buildCapabilityApprovalPrompt(capability, input)`.

### Dispatcher

```typescript
function buildCapabilityApprovalPrompt(capability, input): { title, summary, detail }
```

Routes by capability name:

| Capability | Prompt Builder |
|------------|---------------|
| Operation-specific canonical mutation execution | `buildMutationApprovalPrompt(input)` |
| `debug.zotero.eval` | `buildDebugZoteroEvalApprovalPrompt(input)` |
| Any other | Generic "Approve Host Bridge action?" with capability name and summary |

### Mutation Approval Prompts

The canonical mutation approval builder dispatches by
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

`buildDebugZoteroEvalApprovalPrompt(input)`:

- Title: `"Approve Zotero debug eval?"`
- Detail includes risk warning:
  `"Risk: this code can read or modify Zotero state depending on what it does."`
- `input.code` is truncated to 500 characters via `compactApprovalText()`.

### Truncation Helper

`compactApprovalText(value, limit)` truncates a string to `limit`
characters, appending `...[truncated]` when the source exceeds the limit.
