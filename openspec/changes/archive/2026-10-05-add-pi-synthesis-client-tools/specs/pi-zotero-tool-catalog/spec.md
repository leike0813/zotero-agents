## MODIFIED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL retain `context.get_current_view` as `zotero_context_get_current_view` with strict empty-object input among the sixteen reviewed context, library, and metadata read mappings, including Saved Search discovery and bounded lexical item search, and SHALL expose the twenty-three reviewed business mutations when their trusted owner and durable evidence dependencies are supplied. It SHALL expose seven reviewed navigation mappings when transient navigation authority is supplied. Synthesis Client tools SHALL be composed through an independent local catalog. It SHALL NOT expose low-level note payload, generic mutation, or unreviewed Broker members, resolve a global broker, or substitute direct Zotero calls. Inputs SHALL be closed portable JSON objects with no caller-supplied operation identity, owner, signal, native path, callback, prepared resource, storage wrapper, artifact schema, or computed basis; enumeration inputs SHALL use `filter` and search inputs SHALL use `query` with no alias between them.

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

- **WHEN** an owner supplies the independent Synthesis catalog
- **THEN** the Native catalog retains sixteen reads and the independent Synthesis catalog adds 29 tools with no Native Synthesis dispatch

### Requirement: Native search tools project canonical bounded lexical reads

The catalog SHALL expose `library.search_items` as `zotero_library_search_items` through the Broker's `library.searchItems`. It SHALL claim `bounded-read`, accept closed canonical query and scope/paging inputs, and forward them unchanged. The independent Synthesis catalog SHALL own the existing Synthesis search names.

#### Scenario: Library search dispatches through the Broker

- **WHEN** an admitted turn calls `zotero_library_search_items` with a valid query
- **THEN** it invokes only the injected broker's `library.searchItems` and returns its canonical result DTO

#### Scenario: Query is distinct from enumeration filter

- **WHEN** an enumeration tool receives `query` or a search tool receives `filter`
- **THEN** the closed schema rejects the call without adapting one parameter to the other

#### Scenario: Synthesis search requires the injected client

- **WHEN** an admitted turn calls `zotero_synthesis_search_evidence` or `zotero_topics_search` from the independent Synthesis catalog
- **THEN** that catalog resolves the injected Client lazily and calls only `searchEvidence` or `topics.search`

#### Scenario: Synthesis resolver is absent

- **WHEN** only the Broker Native catalog is supplied
- **THEN** no Synthesis tool is exposed or Client started, and the sixteen Broker reads remain available

#### Scenario: Search envelope and opaque cursor are preserved

- **WHEN** an independent Synthesis search returns a canonical page
- **THEN** status, coverage, issues, total, hasMore and nextCursor remain unchanged without translation, automatic retry or source paths

#### Scenario: Search stays bounded and safe

- **WHEN** search output exceeds 50 KiB or the Client raises a failure
- **THEN** the Synthesis catalog returns resource_limited or a safe structured error, maps internal to internal_error and hides unknown native diagnostics

#### Scenario: Shared canonical search schema

- **WHEN** either catalog declares its reviewed search tool input
- **THEN** it reuses the canonical Synthesis search schema with only reachable definitions

## ADDED Requirements

### Requirement: Native file tools claim the owner workspace

File-producing Native tools SHALL claim a non-empty trusted owner output resource key when classified as workspace mutation. Gateway resource validation SHALL remain unchanged.

#### Scenario: File output admission

- **WHEN** an authorized attachment, annotation-export or traversal call is admitted
- **THEN** the Gateway holds the owner workspace claim before file delivery
