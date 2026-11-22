## Implementation

- [x] Coordinate search deadlines across the sidecar, Broker and Bridge.
- [x] Preserve verified hits across lexical, scoring and verification budget exhaustion.
- [x] Verify long indexed source ranges and preserve cursor identity.
- [x] Reserve fallback opportunities and propagate maintenance cancellation to encoding.
- [x] Update runtime documentation and run focused automated validation.
- [x] Verify foreground and endpoint admission, transient overload, cancellation and aligned timeouts.
- [x] Verify measured embedding capacity and warnings across both settings surfaces.
- [x] Verify mixed-search ranking, stale evidence references, scoped graph queries, cache status and managed CLI skill refresh.
- [x] Verify cold and warm ACP Chat and Workbench searches in isolated Zotero.

The seven-platform Host Bridge CLI build for `0.5.2-dev.6` passed freshness
(Actions run 44986667642, aggregate
`dafbe8869d97085133e80ada3ec1e4182364ac91a09e7d4c0db79adb7ccac124`).
The seven-platform sidecar built from `c0afd993e` passed freshness
(Actions run 44987600598, aggregate
`d56b293f4c578d7bc8f586c8febe96afd2e4c0fa2d866452f529f1af39a1c5e9`).
The development XPI built from `13a87da36` has SHA-256
`0e9f1f6644737b461f434732e43de991cbf6a79ca766a5f262940cda79cb463e`.
It includes the HTTP input-stream lifetime fix and recognizes the production
RPC error code when retrying a transient read. Zotero 10.0.1 installed and
activated this exact XPI in an isolated profile. The live Ollama acceptance
run at test revision `31231ba1d` passed all three cases. Batches of six took
1853 ms through ACP Chat, 2390 ms through the CLI, 1783 ms through MCP and
1665 ms through the Workbench client. The reopened Workbench page completed
its first query in 388 ms and subsequent queries in 355–697 ms.

The same XPI and test revision passed all three cases with a loopback backend
that withheld each semantic query response for 11.5 seconds. Batches of six
finished in 69.449 s through ACP Chat, 69.896 s through the CLI, 69.238 s
through MCP and 69.218 s through the Workbench client. All four routes returned
signed vector evidence from the same publication. The Workbench page's slow
query completed in 11.585 s. The live and slow manifests are
`94ba6fe8-8323-4640-950f-a1f80e7d929e` and
`e72501b1-6d70-4cc2-b166-a0fd77c35eac`.
After the fixture began shutting down its own Windows ACP bridge, live run
`37e30e89-ec74-42c5-affd-7fff475ad9cb` at `115cf4c5f` passed all three
cases with complete cleanup and no remaining test-owned bridge process.

During diagnosis, Gecko canceled both loopback HTTP legs approximately five
seconds after Windows link-change notifications while the same sidecar kept
serving health requests. The slow fixture used a 90 s link-change grace in the
isolated profile. The live run used the default network settings. Repeated
transport interruptions can exhaust the single retry on a foreground read.

Read-only coverage audit: the active publication contains metadata for 353
papers and covers eight topics. Of the papers, 336 have both full text and
analysis. The 17 metadata-only papers have 90 ready metadata groups and no
local PDF or Zotero full-text index entries. Three suspended citation-analysis
groups retain 659 fragments. Their notes exist, but their source versions have
not been reconciled. Concept KB revision 3 contains six concepts, 52 senses
and 113 aliases. Its projection is stale and has no index or basis hash.
Expanding retrieval to graph traversal or tag selectors would not fill these
gaps. The audit did not modify the library or rebuild either index.

Synthetic Host provider measurements on the designated Ollama backend and
`qwen3-embedding:4b` returned 2560 dimensions. First and warm query latency
were 3372 ms and 231 ms. Two concurrent pairs completed in 305 ms and 303 ms,
and an eight-document batch took 2343 ms. Bursts of one, three and six queries
completed in 286 ms, 452 ms and 784 ms respectively, with at most two requests
in flight. These measurements cover the provider, independently of Zotero XPI
acceptance.
