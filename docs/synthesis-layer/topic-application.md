# Topic Application

`TopicApplication` is the owner of Synthesis Topic reads and writes: canonical
list/detail reads, planning context, resolver sets, apply/delete, and lexical
search. The runtime, Workflow Host, Host Bridge, MCP, and CLI are projections of
this owner; none of them searches or ranks on its own.

## Topic Search

`client.searchTopics` takes the shared `TopicSearchRequest` and returns the
shared search envelope (`results`, `status`, `method`, `coverage`, `issues`,
`nextCursor`, `hasMore`, `total`) with `method: "lexical"` and
`coverage: { kind: "topic", sections: [...] }`. One result per Topic carries
identity, matched canonical sections, and match reasons; no public score is
exposed. The searchable section inventory is derived from the canonical Topic
artifact schema, so a new canonical section becomes searchable without a second
list here.

Matching and ordering are the shared lexical kernel's. The application supplies
only private field facts: which sections a Topic matched, and how important each
section is. Coverage is the number of distinct query units a Topic covers across
all of its searchable text, so a Topic whose terms are spread over several
sections ranks like one that covered them in a single field. Ordering is
coverage, then exact normalized phrase, then canonical field importance, then
canonical Topic identity. Field importance names the leading sections (`topic`,
then `summary`) and otherwise follows the canonical schema order; schema order
alone would rank `claims` above the Topic definition.

### Bounds

One pass is bounded on every axis that a caller could otherwise grow:

| Bound | Value | Effect when reached |
| --- | --- | --- |
| Directory entries enumerated under `topics/` | 4096 | membership reported incomplete |
| Candidate Topics read per pass | 64 | membership reported incomplete |
| Files inspected per candidate `current` tree | 1024 | member reported unavailable |
| Bytes read per pass | 32 MiB | pass stops at the last candidate that fits |
| Bytes per read inside a member | remaining pass bytes | member reported unavailable |
| Searchable text per field | 256 KiB (kernel maximum) | pass reported as a bounded scan |
| Searchable bytes and fields per pass | 4 MiB / 20000 | pass reported as a bounded scan |
| Query length, results per page, results per round | 4096 UTF-16 / 100 / 500 | request rejected |
| Frozen rounds, round lifetime | 8 / 60 s | eviction reported as an expired cursor |

The byte preflight measures a candidate tree from metadata before any content is
read, and the member read is then capped by what the pass has left, so a file
that grows after it was measured cannot make the pass exceed its bound. This
budget bounds one search pass only; it is not a per-file admission on canonical
reads, and the store's own write-side limits continue to govern what a Topic may
contain.

Enumeration reads directory entries only. A directory without a `current` entry
is not a current-root candidate; a `current` that cannot be read as a real
directory stays in membership as an unavailable candidate, because a member the
round cannot verify must not pass for a member that does not match. An empty but
valid root is a completed search with zero total.

### Results and Continuations

A complete pass reports `completed` with an exact `total`. Any unreadable
candidate, exhausted budget, or reached result cap reports `limited` with
verified matches and `total: null`; an unopenable source reports `unavailable`
with no results. A continuation cursor exists only when membership and every
scanned candidate's content basis were captured completely, including
non-matches, because a changed non-match can enter or leave the ranking. An
incomplete round publishes one page and claims no further pages.

The cursor is an opaque random lookup token into a bounded in-process map. It
carries no paths and no public basis fields, and the page size is not part of the
frozen basis, so a continuation may resize its page. A continuation revalidates
membership and content basis against the canonical owner; it never reruns the
query.

### Errors

Search failures are typed sidecar reasons. A changed or unverifiable basis fails
as `search_cursor_stale` and surfaces as `basis_mismatch` (HTTP 409); a cursor
whose round is unknown, evicted, or past its lifetime fails as
`search_cursor_expired` and surfaces as `invalid_request` (HTTP 400) with the
reason preserved. Malformed cursor syntax fails as `invalid_request`. No cursor
failure reruns the search. The Bridge HTTP adapter returns
`synthesis_search_cursor_rejected` with `details.reasonCode` for stale/expired
rounds; MCP preserves the client code and `details.sidecarReason` in its tool
error, and Workflow preserves its existing conflict/revision-mismatch mapping.

### Coherence Scope

Each pass holds one claim on the existing canonical store, so it observes a
coherent view with respect to writes that go through that owner's admission.
Concurrent modification outside that admission is detected rather than
prevented: a changed basis fails the continuation instead of returning a page
computed from a mixed view.

## Semantic Context

The same Topic owner builds the existing semantic context DTO, including its
required Topic identity, language, definition, resolver, and resolved paper set.
Present structured sections are selected by the intersection of the artifact
and semantic-context schemas; search coverage and context projection each use
their own declared view. Array-form improvement dimensions are projected into
the context's `{ summary, dimensions }` object. This gives callers the chosen
Topic's `comparison_matrix` without introducing another context reader.
