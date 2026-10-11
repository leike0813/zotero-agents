## ADDED Requirements

### Requirement: Upload names SHALL remain independent of storage paths
Bridge uploads SHALL use private unique storage locations with portable filenames. Attachment import SHALL use an explicit target filename when supplied, otherwise the upload display name; title and content type SHALL default from upload metadata. Transport identifiers SHALL not leak into default attachment filenames.

#### Scenario: Client omits optional attachment metadata
- **WHEN** a client imports an upload without a target filename or metadata
- **THEN** the attachment uses the upload's readable name and content type with a portable physical filename

### Requirement: Upload byte cleanup SHALL respect ownership and leases
Consumed or expired unleased uploads SHALL release their owned bytes. A lease SHALL pin uploads through approval and execution. Expiring a download handle for a library attachment or workflow artifact SHALL not delete the referenced file. Cleanup failures SHALL remain diagnosable without replaying a committed mutation.

#### Scenario: Approval exceeds upload expiry
- **WHEN** an attachment mutation retains its upload lease past the expiry timestamp
- **THEN** the upload remains available until the lease is released

#### Scenario: Ordinary attachment download expires
- **WHEN** a registered library attachment download handle expires
- **THEN** its Zotero-managed file remains intact

#### Scenario: Completed operation is replayed
- **WHEN** the upload source has been consumed and its operation is retried
- **THEN** durable operation evidence is returned without reacquiring or recreating the upload
