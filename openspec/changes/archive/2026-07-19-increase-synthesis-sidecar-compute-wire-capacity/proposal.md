## Why

The Citation Graph layout worker canary is constrained by the sidecar's generic
1 MiB HTTP envelope even though ordinary engine-valid graphs can exceed that
size. Production routing must not proceed until compute transport has a larger,
explicitly bounded capacity with symmetric client and server enforcement.

## What Changes

- Give sidecar compute calls an 8 MiB UTF-8 request and response envelope while
  preserving the 1 MiB limit for general and system capabilities.
- Parameterize request reading and JSON structural validation, reject oversized
  `Content-Length` and chunked bodies before dispatch, and stop reading on
  disconnect or overflow.
- Add compute-client request preflight and response caps plus a stable
  `response_body_too_large` transport error.
- Raise the compute request structural-node limit to 250,000 while retaining a
  50,000-node response limit, depth 32, string 64 KiB, and all engine bounds.
- Document and test the wire bound independently from the Citation Graph
  engine's 5,000-node/20,000-edge calculation bound.
- Keep the layout endpoint a non-production canary; no production client route,
  database owner, fallback, dependency, endpoint, or runtime prebuild changes.

## Capabilities

### New Capabilities

- `synthesis-sidecar-compute-wire-capacity`: Defines capability-specific byte
  and JSON structure limits, symmetric enforcement, abort behavior, and stable
  oversized-request/result errors for sidecar compute transport.

### Modified Capabilities

- `synthesis-sidecar-compute-worker-pool`: Requires oversized compute traffic
  to be rejected outside scheduling and excluded from runtime-fault accounting.
- `synthesis-sidecar-runtime-foundation`: Separates generic/system and compute
  HTTP envelope limits while retaining one authenticated call endpoint.
- `synthesis-invariant-guardrails`: Keeps the larger compute envelope bounded
  without changing production routing or service authority.
- `synthesis-persistence-performance`: Records bounded transient memory and
  responsive control-plane requirements under maximum-size compute traffic.
- `synthesis-layer-doc-system`: Documents the capacity contract and the
  unchanged production ownership boundary.

## Impact

- Updates shared sidecar limit/error contracts, service request handling and
  response serialization, and the internal compute client.
- Adds Core 196 and focused extensions to sidecar foundation, worker, packaging,
  invariant, and performance tests.
- Updates Synthesis runtime, performance, packaging/governance, README, and
  Stage 1 progress documentation.
- Does not change `SynthesisClient`, Workbench, Host Bridge, MCP, database,
  canonical files, worker topology, dependencies, or release artifacts.
