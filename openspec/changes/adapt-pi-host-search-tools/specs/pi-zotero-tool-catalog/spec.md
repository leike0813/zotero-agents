# Spec Delta

## MODIFIED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL retain `context.get_current_view` as `zotero_context_get_current_view` with strict empty-object input among the sixteen reviewed context, library, and metadata read mappings, including Saved Search discovery and bounded lexical item search, and SHALL expose the twenty-three reviewed business mutations when their trusted owner and durable evidence dependencies are supplied. It SHALL expose seven reviewed navigation mappings when transient navigation authority is supplied. When an optional lazy Synthesis client resolver is supplied it SHALL additionally expose the two reviewed Synthesis search reads, for eighteen reads. It SHALL NOT expose low-level note payload, generic mutation, or unreviewed Broker members, resolve a global broker, or substitute direct Zotero calls. Inputs SHALL be closed portable JSON objects with no caller-supplied operation identity, owner, signal, native path, callback, prepared resource, storage wrapper, artifact schema, or computed basis; enumeration inputs SHALL use `filter` and search inputs SHALL use `query` with no alias between them.

#### Scenario: Valid current-view call
- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** it invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO

#### Scenario: Malformed input or missing capability
- **WHEN** a call has an extra field or the required trusted capability is missing
- **THEN** it fails without invoking a Zotero runtime fallback

#### Scenario: Reviewed complete catalog
- **WHEN** a turn freezes the catalog with trusted mutation dependencies and valid navigation authority
- **THEN** it contains sixteen reads, twenty-three mutations and seven navigation tools, with unique names and IDs and no generic note-payload tool

#### Scenario: Reviewed read catalog
- **WHEN** a turn freezes the complete reviewed native read catalog
- **THEN** it retains sixteen unique read capability IDs and tool names, with no note-payload tool

#### Scenario: Read-only composition
- **WHEN** only the complete read dependencies are supplied
- **THEN** only the sixteen read tools are available

#### Scenario: Synthesis resolver extends the read catalog
- **WHEN** the complete read dependencies and a lazy Synthesis client resolver are supplied
- **THEN** the frozen read catalog contains eighteen unique read tools

## ADDED Requirements

### Requirement: Native search tools project canonical bounded lexical reads

The catalog SHALL expose `library.search_items` as `zotero_library_search_items` through the Broker's `library.searchItems`, and SHALL expose `synthesis.search_evidence` as `zotero_synthesis_search_evidence` and `topics.search` as `zotero_topics_search` through the optionally injected Synthesis client. The two Synthesis tools SHALL exist only when a lazy client resolver is supplied. All three SHALL claim `bounded-read`, accept closed canonical query and scope/paging inputs, and forward them unchanged.

#### Scenario: Library search dispatches through the Broker
- **WHEN** an admitted turn calls `zotero_library_search_items` with a valid query
- **THEN** it invokes only the injected broker's `library.searchItems` and returns its canonical result DTO

#### Scenario: Synthesis search requires the injected client
- **WHEN** an admitted turn calls `zotero_synthesis_search_evidence` or `zotero_topics_search` while a resolver is supplied
- **THEN** the tool resolves the client lazily and invokes only its `searchEvidence` or `topics.search` member

#### Scenario: Synthesis resolver is absent
- **WHEN** a turn freezes the catalog without a Synthesis client resolver
- **THEN** the two Synthesis search tools are absent, no Synthesis client or sidecar is started, and the Broker read tools remain available

#### Scenario: Query is distinct from enumeration filter
- **WHEN** an enumeration tool receives `query` or a search tool receives `filter`
- **THEN** the closed schema rejects the call without adapting one parameter to the other

#### Scenario: Search envelope and opaque cursor are preserved
- **WHEN** a search returns a paged canonical result
- **THEN** its `status`, `coverage`, `issues`, `total`, `hasMore` and opaque `nextCursor` reach the caller unchanged, with no cursor translation, cache, automatic retry, or source path

#### Scenario: Search stays bounded and safe
- **WHEN** a search result exceeds the Gateway limit or the client raises a failure
- **THEN** an oversized result fails as `resource_limited`, a structured `SynthesisClientError` keeps its safe code and details, `internal` maps to `internal_error`, and an unknown exception exposes no native diagnostic

#### Scenario: Shared canonical search schema
- **WHEN** the catalog declares a search tool input
- **THEN** it reuses the canonical Synthesis search schema with only reachable definitions, matching the MCP projection
