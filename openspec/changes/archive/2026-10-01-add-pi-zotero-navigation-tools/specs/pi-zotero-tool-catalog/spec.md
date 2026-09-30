## MODIFIED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities

The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and owner-scoped managed-file capability. It SHALL retain `context.get_current_view` as `zotero_context_get_current_view` with strict empty-object input among the fifteen reviewed context, library, and metadata read mappings, including Saved Search discovery, and SHALL expose the twenty-three reviewed business mutations when their trusted owner and durable evidence dependencies are supplied. It SHALL expose seven reviewed navigation mappings when transient navigation authority is supplied. It SHALL NOT expose low-level note payload, generic mutation, or unreviewed Broker members, resolve a global broker, or substitute direct Zotero calls. Inputs SHALL be closed portable JSON objects with no caller-supplied operation identity, owner, signal, native path, callback, prepared resource, storage wrapper, artifact schema, or computed basis.

#### Scenario: Valid current-view call
- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** it invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO

#### Scenario: Malformed input or missing capability
- **WHEN** a call has an extra field or the required trusted capability is missing
- **THEN** it fails without invoking a Zotero runtime fallback

#### Scenario: Reviewed complete catalog
- **WHEN** a turn freezes the catalog with trusted mutation dependencies and valid navigation authority
- **THEN** it contains fifteen reads, twenty-three mutations and seven navigation tools, with unique names and IDs and no generic note-payload tool

#### Scenario: Reviewed read catalog
- **WHEN** a turn freezes the complete reviewed native read catalog
- **THEN** it retains fifteen unique read capability IDs and tool names, with no note-payload tool

#### Scenario: Read-only composition
- **WHEN** only the complete read dependencies are supplied
- **THEN** only the fifteen read tools are available

## ADDED Requirements

### Requirement: Navigation projects the seven reviewed canonical operations

The catalog SHALL explicitly expose zotero_focus_zotero, zotero_select_library_view, zotero_select_collection, zotero_select_saved_search, zotero_reveal_items, zotero_open_item and zotero_open_reader_location with host-control classification and foreground-only, single-per-batch descriptors. Inputs SHALL be the direct canonical portable objects; reveal accepts 1–100 distinct refs, library view uses the six supported kinds, Reader location uses the closed page/annotation/epub union with non-negative pageIndex and a non-empty CFI of at most 4096 characters. Handlers SHALL forward the trusted original target and cancellation outside JSON. Results and stable errors SHALL retain canonical semantics and non-retryability; unknown exceptions SHALL expose no native diagnostics. Content-navigation descriptions SHALL disclose their foreground effect and discourage redundant focus calls.

#### Scenario: Seven canonical mappings execute
- **WHEN** valid foreground calls request each of the seven operations
- **THEN** they reach only their corresponding injected Broker member and return its portable result

#### Scenario: Reader location has an extra field
- **WHEN** a Reader location includes a raw native field or conflicting attachment
- **THEN** the call fails before Broker dispatch

#### Scenario: Navigation fails after first effect
- **WHEN** a Broker call fails after notifying the first-effect boundary
- **THEN** Pi reports unknown certainty without no-effect cancellation or automatic replay

### Requirement: Saved Search discovery uses bounded canonical reads

zotero_library_list_saved_searches SHALL forward libraryId, optional limit and cursor to the Broker, preserving portable saved-search refs, canonical order and paging with default 25 and maximum 100. Saved Search display names SHALL NOT become navigation authority.

#### Scenario: Discover then select a Saved Search
- **WHEN** the Agent reads a bounded Saved Search page and selects a returned ref
- **THEN** the canonical ref reaches navigation unchanged without lookup by name
