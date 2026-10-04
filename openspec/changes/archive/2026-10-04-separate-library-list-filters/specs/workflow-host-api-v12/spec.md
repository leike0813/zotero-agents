## MODIFIED Requirements

### Requirement: Workflow readers SHALL preserve canonical page and control semantics
Workflow library members SHALL explicitly project Broker source pages and call controls. `library.listItems` and `library.traverseItems` SHALL accept the optional string `filter`; list criteria SHALL echo `filter`. Complete consumers SHALL follow continuation to exhaustion, including empty nonterminal payload scans. The projection SHALL NOT accept both complete arrays and pages, rebuild legacy rich objects, or reacquire live selection to compensate for changed reader results.

#### Scenario: A workflow needs an attachment on a later page
- **WHEN** a research bundle or workflow reader searches beyond its first page
- **THEN** it follows canonical continuation and preserves the existing complete task result.

#### Scenario: Scoped workflow is canceled
- **WHEN** cancellation occurs between source pages
- **THEN** no subsequent native page starts and no successful complete result is fabricated.

#### Scenario: Workflow filters a library enumeration
- **WHEN** either v12 interaction variant lists or traverses using a filter
- **THEN** it forwards that criterion and trusted control to the Broker and preserves stable identity ordering
- **AND** no independent query implementation or host escape hatch is added.

#### Scenario: Collector reconciles membership in a target collection
- **WHEN** collection-collector applies selected papers that already exist in the library but only some belong to the target collection
- **THEN** membership pages SHALL use the canonical portable `collectionRef` for that target on every continuation
- **AND** only papers already in that collection SHALL be excluded from the proposed membership addition.

#### Scenario: Auditor resolves the library from an empty canonical page
- **WHEN** tag-auditor starts with a canonical list page, including an empty page
- **THEN** the audit and traversal SHALL use the resolved `criteria.libraryId`
- **AND** completed empty traversal SHALL publish an empty audit for that resolved library.
