# Design: Topic Digest Representative Image Rendering

The representative image remains a Zotero note enhancement block, not part of
the canonical digest markdown payload. The resolver therefore reads it from the
digest note HTML after the digest artifact has been selected by
`resolveTopicPaperDigest`.

The resolver is opt-in through `include_representative_image` /
`includeRepresentativeImage`. This keeps MCP/tool callers from receiving a large
base64 image unless the UI explicitly needs it.

When enabled, the Host:

1. Parses `<div data-zs-block="representative-image">`.
2. Extracts the embedded image attachment key from `data-attachment-key` or the
   block-level `data-zs-representative_image_attachment_key`.
3. Resolves the attachment in the same Zotero library.
4. Verifies the attachment parent is the selected digest note.
5. Reads local image bytes and returns a bounded data URL DTO for the workbench.

Any failure produces a `representative_image.status = "unavailable"` DTO with
diagnostics. The digest markdown result remains available.

The modal renders the image in a dense research UI style: a small media band
above the markdown body, no decorative card nesting, max-width bounded by the
existing 720px representative-image policy, and a muted caption.
