## MODIFIED Requirements

### Requirement: Topic synthesis has a structured canonical artifact

Topic synthesis SHALL have a structured JSON artifact as its display and reuse
source of truth, while Markdown remains a compatibility export.

#### Scenario: Paper evidence references original digest artifacts

- **WHEN** a paper evidence entry corresponds to a resolved library paper with an
  available digest
- **THEN** the entry SHALL include a host-resolvable `digest_ref`
- **AND** `digest_ref` SHALL identify the original `digest-markdown` payload
  using locator fields such as paper ref, item ref, note key, and payload type
- **AND** `digest_ref.payload_hash` SHALL NOT be required
- **AND** the structured topic artifact SHALL NOT duplicate the full
  `digest-markdown` body.

### Requirement: Topic synthesis final products remain structured-only

The topic synthesis skill runtime SHALL not emit run-workspace markdown exports.

#### Scenario: Final validation creates only structured run artifacts

- **WHEN** final validation succeeds
- **THEN** create/update full writes `result/topic-analysis.json` and
  `result/result.json` or `result/final-output.candidate.json`
- **AND** section and sidecar manifest entries SHALL include `path` and
  `content_type`
- **AND** manifest entry hashes SHALL NOT be required
- **AND** no `preview.md`, `export.md`, or `markdown_path` is part of the skill
  output contract.

## ADDED Requirements

### Requirement: Host apply avoids digest hash freshness blocking

Host apply SHALL treat digest references as locators, not freshness proofs.

#### Scenario: Digest hash is absent or stale

- **WHEN** a topic synthesis artifact references an available digest artifact by
  paper ref and payload type
- **AND** `digest_ref.payload_hash` is absent or differs from the current digest
  artifact hash
- **THEN** Host apply SHALL NOT reject the artifact for that hash mismatch.

#### Scenario: Digest body is embedded

- **WHEN** a topic synthesis artifact embeds full digest markdown in
  `paper_evidence`
- **THEN** Host apply SHALL reject the artifact.
