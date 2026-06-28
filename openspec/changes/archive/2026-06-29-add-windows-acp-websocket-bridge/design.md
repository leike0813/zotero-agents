## Context

ACP backends communicate over newline-delimited JSON-RPC on stdio. In Zotero on
Windows, the plugin previously launched backend commands directly with Mozilla
Subprocess and then read/wrote child stdout/stdin from JavaScript. Multiple
diagnostic rounds showed that command discovery, login environment injection,
and backend authentication could be correct while the stdio transport still
failed under GUI-launched Windows Zotero.

The failure boundary is transport-specific. Backend logic, ACP request
serialization, runtime command resolution, and non-Windows launch paths are not
the primary problem. Therefore the change introduces a Windows-only transport
implementation behind the existing ACP abstraction instead of changing ACP
callers or replacing backend command resolution.

## Goals / Non-Goals

**Goals:**

- Preserve user-visible ACP behavior on Windows: backend refresh, probing,
  chat, SkillRunner-compatible runs, recovery, resume, and cleanup.
- Use one bridge daemon per plugin runtime and one WebSocket connection per ACP
  transport.
- Keep each ACP transport isolated by spawning one backend child process per
  WebSocket connection.
- Reuse existing runtime command launch plans and environment overlays.
- Provide enough audit evidence to distinguish plugin parsing bugs, bridge
  forwarding bugs, and backend protocol behavior.
- Keep the bridge independent from Host Bridge CLI.

**Non-Goals:**

- Do not implement a persistent ACP session manager inside the bridge.
- Do not translate ACP JSON-RPC semantics in the bridge.
- Do not rewrite backend commands or parse npm/opencode shim internals.
- Do not require users to install Node.js for bridge operation.
- Do not replace non-Windows stdio transports.

## Architecture

### Process Model

The plugin lazily starts `zotero-acp-bridge.exe` on Windows Zotero runtime. The
bridge listens on `127.0.0.1` with a random token embedded in the WebSocket URL.
The plugin stores a singleton service snapshot for the current plugin runtime.
Multiple ACP transports reuse that daemon but open separate WebSocket
connections.

Each WebSocket connection maps to one ACP backend child process. Closing the
transport closes the WebSocket and requests cleanup of only that child process.
Plugin shutdown closes the bridge daemon.

### Binary Placement

The bridge binary is packaged under `addon/bin/win32-x64/`. At runtime the
plugin reads the packaged binary and `.sha256` sidecar, then writes the binary
to a content-addressed runtime path. Content-addressed placement avoids
overwriting a running `.exe` and prevents Windows file-lock failures during
plugin reloads.

### Wire Protocol

The first WebSocket text frame is a spawn request:

```json
{
  "type": "spawn",
  "id": "<spawnId>",
  "command": "<resolved command>",
  "args": [],
  "cwd": "<workspace>",
  "env": {},
  "auditFile": "<optional bridge audit path>"
}
```

The bridge replies with a text control frame:

```json
{ "type": "spawned", "id": "<spawnId>", "pid": 1234 }
```

After spawn:

- Client binary frames are written to child stdin.
- Child stdout bytes are returned as binary WebSocket frames.
- Child stderr bytes are returned as text control frames with base64 payloads.
- Child exit is returned as a text control frame.
- Bridge errors are returned as text control frames.

The bridge does not inspect ACP JSON-RPC messages except for audit previews. It
is a byte bridge, not an ACP protocol adapter.

### Transport Selection

`launchAcpTransport()` keeps its external contract. It selects the transport by
runtime:

- Windows Zotero/Mozilla runtime: WebSocket bridge transport.
- Non-Windows Zotero/Mozilla runtime: existing Mozilla Subprocess stdio
  transport.
- Node tests: existing Node transport and bridge test overrides.

If the bridge binary is unavailable or the daemon fails to become ready, Windows
ACP launch fails with an explicit bridge transport error. It does not silently
fall back to the known-unreliable direct stdio path.

### Command and Environment Ownership

The bridge receives `command`, `args`, `cwd`, and `env` from the plugin-side
runtime launch plan and environment builder. The bridge never runs PATH search,
shim discovery, `.exe` resolution, or backend-specific command interpretation.
This keeps runtime command behavior centralized in platform services.

### Audit Model

Four high-volume audit streams are written only when debug mode is enabled:

- `timeline.ndjson`: plugin-side lifecycle and diagnostic timeline events.
- `acp-updates.ndjson`: sanitized ACP `session/update` summaries.
- `bridge.ndjson`: low-level child process, WebSocket, stdin/stdout/stderr, and
  exit events written by the Rust bridge.
- `transport.ndjson`: plugin-side launch, WebSocket, frame, lifecycle, and
  cleanup events written by the ACP transport.

The bridge and transport streams include the same `spawnId`. This lets
developers prove whether bytes were read from the child, forwarded over
WebSocket, and consumed by the plugin transport. Secret-bearing values are
redacted by key pattern and payload preview sanitization.

For ACP SkillRunner-compatible runs, the files live under the existing
run-specific namespace:

```text
<runWorkspace>/.acp/<skillId>.<attempt>/bridge.ndjson
<runWorkspace>/.acp/<skillId>.<attempt>/transport.ndjson
```

For backend refresh/probe diagnostics, the files live under the diagnostic
runtime directory:

```text
<runtimeDir>/.acp/bridge.ndjson
<runtimeDir>/.acp/transport.ndjson
```

## Decisions

- Use Rust for the bridge binary.
  - Rationale: avoids a user Node.js dependency, produces a small standalone
    Windows executable, and can handle stdio/WebSocket byte forwarding without
    plugin runtime limitations.
- Use raw WebSocket frames instead of JSON-wrapping stdout.
  - Rationale: ACP stdout is already a byte stream; binary frames avoid
    unnecessary encoding and preserve framing independence.
- Use text control frames for lifecycle, stderr, exit, and errors.
  - Rationale: the plugin can distinguish protocol stdout from diagnostics
    without competing reads on stdout.
- Keep one bridge daemon and one child per WebSocket connection.
  - Rationale: daemon reuse avoids repeated binary startup cost while retaining
    process isolation per ACP transport.
- Keep the bridge independent from Host Bridge CLI.
  - Rationale: Host Bridge exposes Zotero capabilities to agents, while ACP
    bridge only repairs Windows child stdio transport. Sharing crates or
    release logic would couple unrelated lifecycles.

## Risks / Trade-offs

- WebSocket availability in Zotero chrome context varies by runtime surface.
  The plugin must choose a constructor that works in Zotero and provide clear
  diagnostics when unavailable.
- The bridge daemon is another native binary to build, package, and validate.
  Packaging scripts and `.sha256` sidecars are required to keep plugin releases
  reproducible.
- A bridge crash affects Windows ACP launches until the singleton restarts. The
  plugin must detect bridge closure and restart on the next launch.
- Audit files can grow during verbose runs. They are diagnostic artifacts under
  run-local or probe-local runtime directories, are written only in debug mode,
  and must keep payload previews bounded.

## Validation

- Rust unit tests cover spawn request parsing, token/handshake behavior,
  stdout/stderr/exit forwarding, client close cleanup, and audit redaction.
- Node unit tests cover transport selection, spawn request construction,
  singleton reuse, restart behavior, bridge binary packaging, environment
  overlay propagation, and non-Windows fallback.
- Existing ACP transport and SkillRunner-compatible runner tests cover
  unchanged public behavior.
