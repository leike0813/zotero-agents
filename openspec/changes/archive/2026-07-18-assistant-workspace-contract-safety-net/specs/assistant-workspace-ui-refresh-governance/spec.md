## MODIFIED Requirements

### Requirement: Region isolation is locked at subtree node identity

Assistant Workspace UI invariant tests SHALL compare the full subtree node
list of every managed region element-wise by reference across
transcript-only, loading, streaming, and counts-only updates. Comparing only
region mount nodes SHALL NOT be accepted as evidence of isolation, because
mounts are reused permanently and a guard miss can rebuild mount content
while preserving the mount node.

#### Scenario: Transcript-only publication arrives

- **WHEN** only the transcript selection state changes
- **THEN** every non-transcript managed region's subtree node list SHALL be
  element-wise identical before and after the render
- **AND** a guard miss that rebuilds any region content SHALL fail the test
  even when the region mount node itself is preserved.

#### Scenario: Counts-only update arrives

- **WHEN** only message-count values change
- **THEN** counter item nodes SHALL be preserved by identity
- **AND** every other managed region's subtree SHALL be element-wise
  identical.
