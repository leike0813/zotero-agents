## MODIFIED Requirements

### Requirement: Collection and annotation reads SHALL be complete within their bounds
Collection and annotation reads SHALL return source-bounded pages in stable order, with a default limit of 25 and a maximum of 100. Collection rows SHALL expose portable parent identity, revision, active state, and display path. Annotation pages SHALL preserve native annotation order with a stable identity tie-breaker. Hydration or serialization failure of any target SHALL fail the entire page rather than return an incomplete successful list.

#### Scenario: Caller builds a collection tree
- **WHEN** the caller follows all collection page cursors
- **THEN** parent references provide enough information to build a tree without a separate tree member or full-library hydration.

#### Scenario: Annotation page continues
- **WHEN** more annotations remain than fit the requested page
- **THEN** the result contains a bounded page and opaque continuation, with no full annotation-array fallback.

## ADDED Requirements

### Requirement: Ordinary read pages SHALL be sourced and owned by the Broker
Items, collections, notes, note payloads, attachments, annotations and Saved Searches SHALL be read through bounded source pages. Ordinary list defaults and maxima SHALL be 25 and 100. Each domain SHALL return its named array and explicit continuation, returned count and effective limit, retaining existing domain fields. Cursors SHALL bind domain, normalized criteria, source and ordering position, with content basis where required. Ordinary live lists SHALL NOT imply snapshot consistency or acquire a time-to-live. Numeric/offset cursors, malformed or unsupported cursors, query mismatch and changed content basis SHALL produce structured failures without silently restarting.

#### Scenario: Only a current page is hydrated
- **WHEN** a client requests one page from a large source
- **THEN** only that page's targets are hydrated and serialized; count queries do not hydrate non-page targets.

#### Scenario: Page target fails
- **WHEN** any target cannot be hydrated or read
- **THEN** the entire page fails with stable code, retryability and safe details, without skipped target success.

### Requirement: Payload discovery SHALL use bounded candidate pages
Payload discovery SHALL preserve all HTML and attachment candidates without deduplication. It SHALL expose total:null, returned, scanned, hasMore and nextCursor, with an empty nonterminal page permitted. Source HTML SHALL be bounded to 1 MiB UTF-8; encoded payload inputs and decoded payload values SHALL each be bounded to 1 MiB before unbounded allocation or decode. Single payload lookup SHALL preserve complete candidate ambiguity validation.

#### Scenario: Candidate slice contains no payload
- **WHEN** more source candidates remain after a slice containing no payload
- **THEN** the page is empty with hasMore:true and a continuation that advances the source.

#### Scenario: Payload source exceeds a bound
- **WHEN** source or decoded content exceeds its hard bound
- **THEN** the operation fails as resource_limited without returning partial payload summaries.

### Requirement: Saved Search discovery SHALL use portable identity
The Broker SHALL expose library.listSavedSearches with optional libraryId, limit and opaque cursor. The omitted library SHALL resolve to the user library. Rows SHALL contain portable {libraryId,key} refs and display names, with source-bounded identity ordering and 25/100 page limits. Names SHALL NOT serve as control identity.

#### Scenario: Identically named searches exist
- **WHEN** two Saved Searches have the same name
- **THEN** discovery preserves both distinct portable refs.

### Requirement: Broker Host entry SHALL be serial and slice-bounded across instances
All Broker instances and projections SHALL share FIFO admission for native Host critical slices, with maximum native reentry one. Long read/export/capture loops SHALL release admission and yield after at most 100 items or 50 ms, whichever comes first. Network, file preparation, callbacks, detached-data processing, approval and receipt persistence SHALL NOT monopolize Host admission.

#### Scenario: Callback waits while another caller reads
- **WHEN** a traversal callback or translator network request remains pending
- **THEN** another Broker caller can enter a native slice without waiting for that external work.

#### Scenario: Queued read is canceled
- **WHEN** a caller cancels before admission
- **THEN** no native work starts and the call returns stable canceled data.

#### Scenario: Native work outlives cancellation
- **WHEN** an active slice times out or is canceled but native work has not settled
- **THEN** the slice retains admission until settle and no late success is published.

### Requirement: Nontrivial reads SHALL honor trusted call control
Readiness audit, annotation export, traversal, snapshot, metadata translation and ordinary asynchronous reads SHALL check trusted cancellation before Host entry, between bounded items, and after awaited work. Controls SHALL remain outside semantic JSON. Translation SHALL suppress late results without assuming unsupported native abort methods.

#### Scenario: Translation returns after cancellation
- **WHEN** a canceled identifier lookup later produces a result
- **THEN** the result is suppressed and the caller receives stable canceled data.
