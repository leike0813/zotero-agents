## MODIFIED Requirements

### Requirement: Host Bridge attachment outputs omit host-local paths

Host Bridge capability and MCP results SHALL not expose host-local attachment paths. Attachment reads and canonical mutation receipts or attempts SHALL use the same remote projection and return an opaque broker-issued file descriptor when available. They SHALL not expose prepared-file paths, upload handles, leases, public tokens, caller revisions, or raw Host objects.

#### Scenario: Canonical mutation creates or changes an attachment
- **WHEN** mutation.execute returns attachment facts in a receipt or attempt
- **THEN** every attachment summary SHALL omit host-local and prepared-file paths
- **AND** available content SHALL be represented only through remote-safe descriptors.

#### Scenario: Caller reads item attachments
- **WHEN** a Host Bridge or MCP caller reads item attachment metadata
- **THEN** each attachment result SHALL omit its host-local path
- **AND** available content SHALL be represented by an opaque file descriptor or structured unavailable state.

#### Scenario: Mutation creates an attachment
- **WHEN** mutation.execute successfully creates an attachment
- **THEN** every attachment summary in the canonical evidence SHALL omit host-local paths
- **AND** it SHALL use the same remote-safe descriptor projection.

## ADDED Requirements

### Requirement: Canonical mutation evidence SHALL have its own output boundary

Bridge, MCP, and CLI projections of canonical mutation execute and observation SHALL expose operation identity, operation kind, receipt or attempt state, bounded affected and residual portable refs, and typed recovery data. They SHALL not use the generic HTTP operation envelope or claim partial success. committed and unchanged are receipts; failed, canceled, unknown, and repair_required are attempts.

#### Scenario: Evidence is incomplete
- **WHEN** a canonical mutation cannot establish complete success evidence or leaves residual work
- **THEN** the output contains the corresponding typed attempt
- **AND** it SHALL not present a partial mutation result as a success receipt.
