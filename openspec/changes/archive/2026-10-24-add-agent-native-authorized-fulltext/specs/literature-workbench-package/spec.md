## MODIFIED Requirements

### Requirement: Literature search ingest SHALL require three public-PDF routes

Every approved direct work SHALL receive ordered PDF research through its
authoritative landing page, applicable open-access sources, and public web
search. A later route MAY be marked `skipped_after_verified_pdf` only when an
earlier route has already produced a verified legal matching PDF.

#### Scenario: Earlier route finds a verified PDF

- **WHEN** the authoritative landing page or open-access route produces a
  verified public PDF
- **THEN** later routes MAY be marked `skipped_after_verified_pdf`

#### Scenario: No earlier route finds a PDF

- **WHEN** no completed earlier route has produced a verified public PDF
- **THEN** every remaining route SHALL be attempted before the paper is treated
  as missing a public PDF

#### Scenario: Public routes are exhausted
- **WHEN** the three public routes produce no usable PDF and the saved or reused paper has an applicable CNKI source
- **THEN** the main Agent SHALL attempt the native authorized-fulltext route before reporting its final PDF outcome
- **AND** public route evidence SHALL remain in the ledger.

### Requirement: Literature search ingest routes Chinese literature to applicable sources

The skill SHALL use additional Chinese metadata sources when the query or
candidate indicates Chinese literature.

#### Scenario: Chinese journal, thesis, or book candidate

- **WHEN** a Chinese literature candidate is resolved
- **THEN** the skill SHALL add China DOI, CNKI, Wanfang, official publishers,
  institutions, or repositories as applicable
- **AND** it SHALL add PDC and library catalogs for Chinese books or ISBNs
- **AND** when the direct work's original publication language is Chinese, each personal author SHALL use the complete authoritative Chinese name in the single Zotero `name` field rather than `firstName` and `lastName`
- **AND** it SHALL use public metadata, landing pages, and legally public PDFs for public-source research
- **AND** after candidate approval and core ingest it SHALL use the native Host acquisition route for applicable institution-authorized CNKI PDFs, retaining credentials and bytes locally.

### Requirement: Literature search ingest SHALL bind raw Host receipts to the current candidate

The Skill SHALL write the exact Host response to the gate-issued `coreReceiptPath` or `attachmentReceiptPath`
and associate it with the current candidate and immutable prepared payload
without requiring the agent to copy those control values into a receipt wrapper.

#### Scenario: Raw Host response is submitted

- **WHEN** the ingest gate receives exact Host JSON at the gate-issued core or attachment receipt path
- **THEN** the receipt SHALL be associated with the current candidate and
  prepared-payload hash
- **AND** `created`, `existing`, `failed`, portable item ref, and initial attachment status SHALL
  be derived from that response.

#### Scenario: Receipt is reused for another candidate

- **WHEN** an accepted receipt hash or inconsistent portable Zotero item ref is submitted
  for another candidate
- **THEN** the receipt SHALL be rejected without advancing state.

#### Scenario: Host mutation cannot start

- **WHEN** the agent cannot start core ingest and records `host_unavailable`, `approval_denied`, or
  `execution_blocked` with a non-empty message
- **THEN** the failure SHALL be bound to the current candidate
- **AND** the Skill SHALL enter canceled terminal state without requiring a
  receipt wrapper.

#### Scenario: Authorized attachment has a separate receipt
- **WHEN** authorized acquisition follows successful core ingest
- **THEN** the gate SHALL preserve the core receipt and bind the exact attachment mutation receipt to the same candidate and confirmed parent under a separate operation identity
- **AND** final PDF status SHALL follow canonical attachment evidence
- **AND** acquisition or attachment failure SHALL NOT replace successful core ingest with a failed ingest outcome.

### Requirement: Literature search ingest SHALL expose a minimal completed output

The completed output SHALL summarize the run without repeating discovery,
metadata, PDF, or recovery evidence that is already available in accepted
payloads and the compact ledger.

#### Scenario: Created or existing item is returned

- **WHEN** an approved candidate completes with `created` or `existing`
- **THEN** its outcome SHALL contain only `title`, `ingestStatus`, `itemRef`,
  `pdfStatus`, and `needsCuration`
- **AND** `itemRef` SHALL contain only the positive Zotero item `id`.

#### Scenario: Failed or not-attempted item is returned

- **WHEN** an approved candidate completes with `failed` or `not_attempted`
- **THEN** its outcome SHALL contain only `title` and `ingestStatus`.

#### Scenario: Completed counts are generated

- **WHEN** completed output is constructed
- **THEN** the output SHALL include discovered, selected, created, existing,
  failed, and not-attempted counts
- **AND** selected count SHALL equal the number of outcomes
- **AND** terminal-status counts SHALL sum to selected count.

#### Scenario: Detailed audit information is needed

- **WHEN** a caller needs identifiers, evidence paths, hashes, reasons, or Host
  receipt summaries
- **THEN** the completed output SHALL point to `result/search-ledger.json`
- **AND** it SHALL NOT duplicate those details in every outcome.

#### Scenario: Authorized acquisition finishes
- **WHEN** final output is constructed after native acquisition
- **THEN** its existing pdfStatus SHALL reflect verified attachment availability rather than only the earlier core-ingest response
- **AND** detailed acquisition reasons and attachment receipts SHALL remain in the compact ledger without credentials, signed URLs, local paths, or PDF bytes.

#### Scenario: Batch is canceled after partial completion
- **WHEN** cancellation follows one or more saved or reused parents
- **THEN** the canceled output SHALL include the same summary, outcomes, and ledger reference needed to preserve partial progress, together with its cancellation reason and message
- **AND** unattempted papers SHALL remain distinguishable from failed papers.

### Requirement: Literature search ingest SHALL add the metadata-curation status after the run
The final apply hook SHALL add `status:need-metadata-curation` only to successfully created or reused outcomes marked `needsCuration`, after idempotently inserting the tag into the controlled vocabulary.

#### Scenario: Controlled vocabulary write precedes item tagging
- **WHEN** at least one final outcome requires metadata curation
- **THEN** apply uses the canonical status transition for deduplicated portable item refs, which saves the governed tag to the Synthesis vocabulary before adding it to the items

#### Scenario: No eligible outcomes cause no tag mutation
- **WHEN** no successful outcome is marked `needsCuration`
- **THEN** apply does not change the vocabulary or item tags

#### Scenario: Tagging can report partial completion
- **WHEN** some item tag writes fail after the vocabulary entry is saved
- **THEN** apply preserves successful writes and returns per-item failures without rolling back ingested items

#### Scenario: Canceled run retains successful outcomes
- **WHEN** a canceled run reports confirmed created or reused parents needing metadata curation
- **THEN** apply SHALL project their status through the same governed vocabulary and tagging path
- **AND** it SHALL NOT tag failed or unattempted outcomes.

