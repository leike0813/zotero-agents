## MODIFIED Requirements

### Requirement: Literature identity is anchor-derived

Paper Registry SHALL derive `literature_item_id` from the selected identity
anchor, not from `paper_ref` by default.

#### Scenario: Zotero-bound paper has a unique strong identifier

- **WHEN** a Zotero-bound paper has a non-conflicting DOI, arXiv, ISBN, or stable
  canonical URL
- **THEN** its `literature_item_id` SHALL derive from that strong work anchor
- **AND** the Zotero binding SHALL preserve `paper_ref` lookup semantics.

#### Scenario: Zotero-bound paper has no strong identifier

- **WHEN** no accepted redirect or strong identity is available
- **THEN** the Registry SHALL use a stable binding fallback anchor
- **AND** the fallback identity SHALL be diagnosable as binding-derived.

#### Scenario: Binding fallback later gains strong identity

- **WHEN** a binding-fallback literature item later receives a unique strong
  identity
- **THEN** the Registry SHALL retarget through a redirect or equivalent durable
  effect
- **AND** dependent references and graph rows SHALL resolve to the strong work
  identity after rebuild.

#### Scenario: CiteKey changes

- **WHEN** a Zotero citeKey changes but DOI/arXiv/stable URL and binding remain
  the same
- **THEN** the canonical `literature_item_id` SHALL remain unchanged.
