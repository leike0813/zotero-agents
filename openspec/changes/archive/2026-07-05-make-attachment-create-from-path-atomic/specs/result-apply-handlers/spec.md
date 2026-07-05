## ADDED Requirements

### Requirement: Path-backed attachment creation SHALL apply creation metadata atomically

The result apply handlers SHALL create path-backed Zotero attachments with requested title and MIME type through Zotero's native attachment creation API rather than applying those creation-time values through a post-create generic field patch.

#### Scenario: Attachment title and MIME type are applied during creation

- **WHEN** a workflow apply hook calls `handlers.attachment.createFromPath()` with a parent item, file path, title, and MIME type
- **THEN** the handler SHALL pass the title and MIME type to Zotero's attachment creation operation
- **AND** the handler SHALL return an attachment linked to the requested parent.

#### Scenario: Creation metadata does not require a post-create field patch

- **WHEN** `handlers.attachment.createFromPath()` receives only creation-time metadata supported by Zotero's attachment creation API
- **THEN** the handler SHALL NOT perform a second generic item-data save solely to apply title or MIME type.
