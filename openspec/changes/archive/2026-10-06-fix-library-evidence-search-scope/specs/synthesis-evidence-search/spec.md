## MODIFIED Requirements

### Requirement: Evidence search SHALL enforce explicit Library scope
Evidence search SHALL resolve omitted `libraryIds` from a supplied collection's Library, or otherwise capture the one current Library at request start; reject empty or ambiguous Library scopes; and treat supplied library, collection, tag, item type, and complete item references as intersecting filters. Item references SHALL be deduplicated after intersection with the resolved Library scope and SHALL NOT expand it.

#### Scenario: Current Library is uniquely available
- **WHEN** a request omits libraryIds and collectionRef and exactly one current Library can be captured
- **THEN** that Library is fixed as the request scope before source enumeration

#### Scenario: Scope is ambiguous or explicitly empty
- **WHEN** no collection is supplied and no unique current Library can be captured, libraryIds is empty, or an explicit scope cannot be resolved
- **THEN** the request fails with an explicit scope error and does not broaden to another Library

#### Scenario: Item references are supplied
- **WHEN** itemRefs contains duplicate complete `{libraryId, key}` identities or is an empty array
- **THEN** duplicates are removed and an empty array yields an empty result scope

#### Scenario: Collection supplies the default Library
- **WHEN** `libraryIds` is omitted and a valid `collectionRef` identifies a collection outside the current Library, or the current view has no unique Library
- **THEN** the collection's Library is fixed as the request scope before source enumeration

#### Scenario: Mixed-Library references intersect the scope
- **WHEN** itemRefs contains both in-scope and out-of-scope identities
- **THEN** only distinct in-scope items satisfying every other filter supply evidence, without rejecting the request or adding Libraries

#### Scenario: Item-reference intersection is empty
- **WHEN** supplied itemRefs contains no identities in the resolved Library scope
- **THEN** evidence search returns a completed zero-result search with no continuation rather than enumerating other items

#### Scenario: Explicit collection scope is invalid
- **WHEN** explicit libraryIds excludes collectionRef.libraryId, or the collection cannot be resolved
- **THEN** evidence search preserves the established explicit scope failure and does not substitute the collection's Library

#### Scenario: Collection-derived Library is not authorized
- **WHEN** a scoped reverse-Host caller omits libraryIds and supplies a collection outside its authorized Libraries
- **THEN** the request fails before any source-owner read in that Library

#### Scenario: Item references include unauthorized Libraries
- **WHEN** the requested Library scope is authorized but itemRefs also includes other Libraries
- **THEN** itemRefs remains an intersection filter and does not authorize or read those other Libraries
