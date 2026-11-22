## Implementation

- [x] Coordinate search deadlines across the sidecar, Broker and Bridge.
- [x] Preserve verified hits across lexical, scoring and verification budget exhaustion.
- [x] Verify long indexed source ranges and preserve cursor identity.
- [x] Reserve fallback opportunities and propagate maintenance cancellation to encoding.
- [x] Update runtime documentation and run focused automated validation.
- [x] Verify foreground and endpoint admission, transient overload, cancellation and aligned timeouts.
- [x] Verify measured embedding capacity and warnings across both settings surfaces.
- [x] Verify mixed-search ranking, stale evidence references, scoped graph queries, cache status and managed CLI skill refresh.
- [ ] Verify cold and warm ACP Chat and Workbench searches in isolated Zotero.

The seven-platform Host Bridge CLI build for `0.5.2-dev.6` passed freshness
(Actions run 44986667642). The final sidecar build targets the graph fix in
`c0afd993e` (Actions run 44987600598).

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
