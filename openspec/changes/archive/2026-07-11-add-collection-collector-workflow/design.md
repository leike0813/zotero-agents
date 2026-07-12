# Design

## Workflow contract

`collection-collector` is a core automatic SkillRunner workflow with no Zotero selection. `collection` is a strict `zotero.collections` dynamic option with no empty/default choice, and `collectionScope` is free text. Both use the new reusable workflow parameter `required` contract.

The submitted collection value remains a stable `libraryId:key` ref. The workflow scans only that collection's library and considers only top-level regular Zotero items. `collectionScope` is the semantic source of truth; current collection members are used only for exclusion and apply-time idempotency.

## Skill runtime

The skill uses a run-local SQLite gate runtime. Command stages validate input and Host access, page library/collection/Topic inventories, prepare candidates, and render results. Agent payload stages author the scope plan and assess exact batches of twenty papers. State, Host receipts, candidate ordering, diagnostics, and assessment coverage are runtime-owned.

Candidate recall merges deterministic metadata/tag term matches with source membership from relevant existing Topics. All library metadata is paged, but at most 250 candidates receive deep semantic assessment. Candidate rank only enforces that budget. The final result includes papers with semantic relevance at least `0.65`, ordered by decreasing relevance and then paper ref. Missing Topic context or item detail degrades to remaining evidence and records diagnostics. Zero matches is a successful empty result.

The skill never calls mutation commands. It returns stable item refs plus relevance, evidence basis, Topic matches, reasons, and caveats in `collection_membership_selection`.

## Apply boundary

The apply hook reads the original workflow parameters rather than trusting the result target. It requires exact collection agreement, validates unique same-library refs and the `0.65` threshold, pages current collection membership again, and resolves every pending item as a top-level regular item before mutation. It performs one `collection.addItems` Host mutation. Empty or already-applied selections are successful no-ops; mutation failures fail workflow apply and can be retried idempotently.

## Required parameters

Workflow parameter schemas gain optional `required: boolean`. Required string values must be non-blank, required numbers must be finite, and required booleans accept both `true` and `false`. Descriptors preserve the flag, settings surfaces mark the field, and execution/Host Bridge validation rejects missing values with one structured error listing every missing field. Existing parameters remain optional unless explicitly marked.
