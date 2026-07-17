# Citation Graph Build Large Transfer

Citation Graph Build has an authenticated sidecar transfer capability for data
sets that do not fit one compute request or response. It is a staging canary,
not a production compute route. Production graph build remains in plugin
composition, which still owns Host capture, the durable-fact basis, basis
recapture, `synthesis.db` promotion, canonical files, and last-good state.

The single capability `compute.citation_graph_build_transfer` supports strict
`begin`, `put_input_page`, `seal_input`, `status`, `get_output_manifest`,
`get_output_page`, and `cancel` actions. Input pages contain `library_nodes` or
`references`. Output pages contain `nodes`, `resolved_edges`,
`aggregate_edges`, `source_ownership`, `incoming_groups`, or `light_metrics`.
Output mutation is service-internal until a later packed worker becomes the
producer.

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

The existing 8 MiB / 250,000-node compute request and 8 MiB / 50,000-node
response limits remain unchanged. Aggregate staging may exceed one envelope,
but every action and returned page remains independently bounded.

Sessions live only below the current profile/supervisor runtime session. The
service uses generated identifiers, `0700` directories, `0600` files, and
atomic page replacement. Cancel, expiry, and shutdown first remove session
addressability and rename its directory to a tombstone; deletion is
best-effort and retried at startup. Sessions are never recovered after a
service restart. Health and handshake report only in-memory state, session
count, and staged bytes.

The HTTP boundary rebuilds one page at a time with synthesis-engine DTO
validators. It does not invoke the full Citation Graph Build result rebuilder,
which recomputes canonical graph semantics. Core 201 compares a paged small
fixture with the direct engine oracle and proves aggregate input beyond 8 MiB,
while the existing benchmark remains the evidence for normal/target/stress
costs.

The next change may transform staged rows into a packed worker representation
and publish bounded output pages. It must not give the worker database,
canonical-file, Host, Zotero-global, or subprocess access. Production routing
and streaming repository promotion remain separate changes.
