## MODIFIED Requirements

### Requirement: Host Bridge help text uses current brand

The Host Bridge CLI, wrapper skill, and generated Host Bridge documentation
SHALL describe the bridge as the `Zotero Agents Host Bridge`.

#### Scenario: CLI help uses current brand
- **WHEN** users inspect Host Bridge CLI package metadata or command help
- **THEN** the visible description uses `Zotero Agents Host Bridge`.

#### Scenario: Profile path contract is unchanged
- **WHEN** Host Bridge resolves or documents well-known profile paths
- **THEN** it continues to use the current `zotero-agents` profile locations
  and does not introduce a new incompatible path.
