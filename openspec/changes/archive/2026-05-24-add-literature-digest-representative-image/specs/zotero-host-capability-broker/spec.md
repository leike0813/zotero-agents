# zotero-host-capability-broker Delta

## ADDED Requirements

### Requirement: Workflow Host API SHALL Expose Note Image Preparation

`WorkflowHostApi` SHALL expose optional image preparation capabilities for workflow packages that need to embed bounded images into Zotero notes.

#### Scenario: Host API exposes image preparation
- **WHEN** a workflow package receives `runtime.hostApi`
- **THEN** `hostApi.images.prepareForNoteEmbedding` SHALL be available on Host API v4
- **AND** it SHALL apply the representative note image compression policy before returning prepared image data.

### Requirement: Workflow Host API SHALL Expose Embedded Image Import

`WorkflowHostApi` SHALL expose a note-level embedded image import operation backed by Zotero embedded-image attachments.

#### Scenario: Workflow imports an embedded note image
- **WHEN** a workflow calls `hostApi.notes.importEmbeddedImage` with a note item and prepared JPEG data
- **THEN** the Host SHALL create an embedded-image attachment under that note
- **AND** the returned value SHALL include the attachment key needed for `<img data-attachment-key="...">`.
