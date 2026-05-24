# Design

The new payload persistence path treats Zotero note HTML as user-visible presentation only. Machine-readable workbench payloads move to a note-child embedded-image attachment because Zotero permits embedded-image attachments under notes and preserves them across note editor normalization.

Each payload attachment is a valid small PNG with a UTF-8 trailer containing `ZS_WORKBENCH_NOTE_PAYLOAD_V1:` followed by base64 JSON. The JSON envelope records `schemaVersion`, `kind`, `payloadType`, `noteKind`, `payload`, and creation metadata. Readers first scan legacy HTML payload blocks for backward compatibility, then scan child embedded-image attachments for the marker.

New generated note HTML uses only legal note structure: a schema-version root, headings, rendered body HTML, and standard image tags for representative images. The representative image attachment is referenced in the note body; payload attachments are not referenced in the note body and remain invisible to users.

Payload writes are required for generated notes. After a note is created or updated, the writer imports one payload attachment per payload type and best-effort removes older payload attachments of the same type under that note. Existing legacy notes are not batch-migrated; updating them through the workbench naturally rewrites them into the new form.

Synthesis and Host Bridge consumers use the same decoding policy so topic registry discovery, artifact export, MCP `note payloads`, MCP `note payload`, and topic digest modal rendering all survive Zotero's note normalization.
