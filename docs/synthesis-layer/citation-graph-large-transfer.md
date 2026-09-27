# Citation Graph Build Large Transfer

Citation Graph Build uses an authenticated transfer capability when canonical
input or output cannot fit one control envelope. The Rust production service
owns the transfer session, bounded worker attempt, durable-basis recapture, and
repository promotion. TypeScript only stages/resolves the client transport;
language-neutral corpora and Rust tests own the former differential evidence.

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

The Rust transfer owner retains only descriptor, path, and byte-range metadata
after atomic upload. It admits one canonical input page at a time, validates the
page hash and typed rows, and waits for worker acknowledgement before advancing.
The bounded worker streams typed output pages back to the owner and has no
staging path, repository, canonical-file, Host, or Zotero authority. The owner
strictly rebuilds each result page and atomically publishes the attempt manifest
before the Rust application may recapture basis and promote repository state.

Output pages are written below an attempt directory and become addressable only
after the service rebuilds the final manifest and atomically commits it.
Failure returns the session to sealed input for explicit retry; cancellation
destroys all session state. Production basis recapture and repository promotion
occur only after a complete committed attempt, so partial or canceled transfer
cannot replace the last-good graph.
