## ADDED Requirements

### Requirement: Host Bridge attachment outputs omit host-local paths

Host Bridge capability and MCP results SHALL NOT expose host-local attachment paths. Attachment reads and mutation results SHALL use the same remote projection and SHALL return an opaque broker-issued file descriptor when download access is available.

#### Scenario: Caller reads item attachments

- **WHEN** a Host Bridge or MCP caller reads item attachment metadata
- **THEN** each attachment result SHALL omit its host-local path
- **AND** available content SHALL be represented by an opaque file descriptor
- **AND** unavailable content SHALL use a structured unavailable state.

#### Scenario: Mutation creates an attachment

- **WHEN** `mutation.execute` successfully performs `item.attachFile`
- **THEN** every attachment summary in the result SHALL omit its host-local path
- **AND** the uploaded file and created Zotero attachment SHALL be represented only through remote-safe descriptors.

