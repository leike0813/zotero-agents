# Citation Graph Build Large Transfer

Citation Graph Build has an authenticated sidecar transfer capability for data
sets that do not fit one compute request or response. Sealed input runs through
the shared Rust child with acknowledged canonical row pages; this capability is not a production
compute route. Production graph build runs in plugin
composition, which still owns Host capture, the durable-fact basis, basis
recapture, `synthesis.db` promotion, canonical files, and last-good state.

The single capability `compute.citation_graph_build_transfer` supports strict
`begin`, `put_input_page`, `seal_input`, `execute`, `status`, `get_output_manifest`,
`get_output_page`, and `cancel` actions. Input pages contain `library_nodes` or
`references`. Output pages contain `nodes`, `resolved_edges`,
`aggregate_edges`, `source_ownership`, `incoming_groups`, or `light_metrics`.
Output mutation remains service-internal and is produced only by the Rust
worker attempt associated with an authenticated `execute`.

Every transfer uses `synthesis-citation-graph-build-transfer.v1` and
`canonical_json_rows.v1`. A complete manifest declares the direction-specific
header and all page descriptors. Page SHA-256 values cover strictly rebuilt
canonical JSON rows; the root SHA-256 covers the canonical header and ordered
descriptors. Upload order is irrelevant. Repeating the same begin key or page
identity is idempotent, while content drift conflicts. Input cannot seal until
every descriptor and the ordered root match.

## Fixed Bounds

| Boundary | Limit |
| --- | ---: |
| Canonical page bytes | 4 MiB |
| Page JSON nodes | 100,000 |
| Pages per direction | 256 |
| Bytes per direction | 1 GiB |
| Active sessions per service | 2 |
| Staged bytes per service | 2 GiB |
| Idle lifetime | 5 minutes |
| Absolute lifetime | 30 minutes |
| Reaper interval | 30 seconds |
| Logical shutdown budget | 500 ms |
| Streaming worker active deadline | 30 seconds |
| Unacknowledged pages per direction | 1 |

Compute requests are limited to 8 MiB / 250,000 nodes and compute responses to
8 MiB / 50,000 nodes. Aggregate staging may exceed one envelope,
but every action and returned page remains independently bounded.

Sessions live only below the current profile/supervisor runtime session. The
service uses generated identifiers, `0700` directories, `0600` files, and
atomic page replacement. Cancel, expiry, and shutdown first remove session
addressability and rename its directory to a tombstone; deletion is
best-effort and retried at startup. Sessions are never recovered after a
service restart. Health and handshake report only in-memory state, session
count, and staged bytes.

The owner retains only descriptor/path/byte-range metadata after atomic upload.
The service, pool, and worker share one canonical page-frame carrier. Each
admitted page is rebuilt once into a canonical UTF-8 artifact whose bytes, byte
length, and SHA-256 are reused for staging and transfer. During an attempt, the
service main thread hash-checks and reads one canonical input frame, transfers
it through a task-scoped `MessagePort`, and waits for worker acknowledgement
before reading another. The Rust child strictly validates every input frame,
moves typed rows into the shared graph-build kernel, and streams the typed
result directly into canonical output page artifacts. The same staged bytes and
raw result artifact are reused; Node does not materialize a full graph, create a
base64 copy, or own a second transfer representation. The owner is the only output validation
and staging boundary: it strictly rebuilds each returned frame, compares its
canonical bytes and descriptor, and only then stages it atomically. The worker
never receives a staging path or database, canonical-file, Host, Zotero-global,
or subprocess authority.

Output pages are written below an attempt directory and become addressable only
after the service rebuilds the final manifest and atomically commits it. Failure
returns the session to `input_sealed` with a structured error and permits an
explicit retry; session `cancel` still destroys all state. Core 202 hard-gates
the 2,000-source/100,000-reference normal profile under the 256 MiB worker old
generation limit. Target/stress profiles are report-only. Production routing,
basis recapture, and repository promotion are outside this capability.
