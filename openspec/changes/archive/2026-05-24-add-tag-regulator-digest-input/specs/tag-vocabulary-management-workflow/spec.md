# tag-vocabulary-management-workflow Delta

## MODIFIED Requirements

### Requirement: Workflow SHALL export controlled tags as plain string arrays
The manager workflow MUST export current controlled tags as `facet:value` string arrays for downstream `tag-regulator` consumption.

#### Scenario: Export strips metadata
- **WHEN** export is triggered
- **THEN** output SHALL contain tag strings only
- **AND** SHALL NOT include note/source/deprecated metadata fields

#### Scenario: Export order is deterministic
- **WHEN** vocabulary content is unchanged across runs
- **THEN** exported array order SHALL remain stable

#### Scenario: Tag regulator may include digest markdown context
- **WHEN** `tag-regulator` builds a SkillRunner request for a parent item with a generated digest note containing a current `digest-markdown` embedded payload attachment
- **THEN** the request SHALL include optional `input.digest_markdown`
- **AND** the request SHALL upload the digest markdown content under the `digest_markdown` upload key
- **AND** the request SHALL keep `valid_tags` as the controlled vocabulary input.

#### Scenario: Tag regulator omits digest markdown when no current payload exists
- **WHEN** the selected parent item has no readable `digest-markdown` embedded payload attachment
- **THEN** the request SHALL omit `input.digest_markdown`
- **AND** request building SHALL continue using metadata, input tags, and valid tags.
