## ADDED Requirements

### Requirement: Literature search ingest SHALL separate broad discovery from ingest eligibility
The workflow SHALL discover candidates across applicable query and source lanes without requiring every candidate to have an identifier, complete authoritative metadata, or an accessible PDF before it can be shown to the user.

#### Scenario: Traceable incomplete candidate remains visible
- **WHEN** discovery finds a candidate with an original title and stable landing URL but incomplete creators or no standard identifier
- **THEN** the workflow exposes it as `needs_curation` instead of filtering it out

#### Scenario: Untraceable lead cannot be ingested
- **WHEN** a candidate lacks a direct-work title or stable source
- **THEN** the workflow retains it only as `lead_only` and does not offer it for ingest

### Requirement: Literature search ingest SHALL execute multilingual query and source lanes
The workflow SHALL plan core, multilingual, seed, and gap lanes as applicable, preserve the user's original concepts, and route Chinese-language searches through simplified, traditional, English, mainland-Chinese, Taiwan, and authoritative original-source strategies without treating a translation as the original record.

#### Scenario: Chinese topic receives multilingual expansion
- **WHEN** the query or confirmed brief targets Chinese-language literature
- **THEN** the plan includes distinct simplified-Chinese, traditional-Chinese, and English semantic variants and applicable Chinese/Taiwan source lanes

#### Scenario: Seed paper enables citation expansion
- **WHEN** a seed paper has local reference or citation-analysis artifacts
- **THEN** the workflow uses those artifacts for backward citation discovery and attempts forward citation discovery only when supported by available tools

### Requirement: Literature search ingest SHALL deduplicate before expensive enrichment
The workflow SHALL compare discovery hits with the target collection, the full Zotero library, and the current batch before performing selected-candidate metadata enrichment or PDF probing.

#### Scenario: PDF probing is deferred
- **WHEN** discovery returns duplicate and unselected candidates
- **THEN** the workflow does not perform PDF probing for those candidates

### Requirement: Literature search ingest SHALL add the metadata-curation status after the run
The final apply hook SHALL add `status:need-metadata-curation` only to successfully created or reused outcomes marked `needsCuration`, after idempotently inserting the tag into the controlled vocabulary.

#### Scenario: Controlled vocabulary write precedes item tagging
- **WHEN** at least one final outcome requires metadata curation
- **THEN** apply saves the governed tag to the Synthesis vocabulary before adding it to deduplicated numeric Zotero item IDs

#### Scenario: No eligible outcomes cause no tag mutation
- **WHEN** the run is cancelled or no successful outcome is marked `needsCuration`
- **THEN** apply does not change the vocabulary or item tags

#### Scenario: Tagging can report partial completion
- **WHEN** some item tag writes fail after the vocabulary entry is saved
- **THEN** apply preserves successful writes and returns per-item failures without rolling back ingested items
