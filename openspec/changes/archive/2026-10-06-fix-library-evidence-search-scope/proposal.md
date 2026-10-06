# Proposal

## Why

The closeout audit of [Library / Topic list and search separation](https://github.com/leike0813/zotero-agents/issues/88) found two remaining Library scope defects: collection-only searches incorrectly use the current Library, and evidence source enumeration rejects mixed-Library item references instead of intersecting them. These violate the approved Q20 and Q24 contracts and block closeout.

## What Changes

- Resolve omitted `libraryIds` from `collectionRef.libraryId` when a collection is supplied; otherwise capture one current Library.
- Share this resolution between Library item search and evidence source enumeration, retaining explicit scope validation.
- Intersect and deduplicate evidence `itemRefs` against the resolved Library scope; preserve explicitly empty references and empty intersections.
- Reject explicit Library/collection scope mismatches consistently and authorize collection-derived Libraries before scoped reverse-Host source reads.
- Extend existing Broker and native production-route tests and align specifications and component documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: Clarify collection-derived Library scope and mixed-Library item-reference intersection for Library search.
- `synthesis-evidence-search`: Apply the same default-scope precedence and item-reference intersection to evidence search.

## Impact

Production changes stay in the Broker and existing scoped reverse-Host handler. Existing Broker, reverse-Host, and Synthesis production-route tests cover the approved seams. Shared DTOs, wire schemas, lexical matching, Topic search, and dependencies require no change. Implementation stays on `dev-refactor` in an independent commit for the user's later cherry-pick to dev.
