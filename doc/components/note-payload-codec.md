# Note Payload Codec

## Overview

The note payload codec (`src/modules/notePayloadCodec.ts`) provides encoding and
decoding of structured payloads embedded inside Zotero notes. It supports two
storage strategies: inline HTML attributes and custom PNG image chunks.

Payloads include digests, reference lists, citation analyses, conversation
notes, and custom workflow artifacts.

---

## Core Types

```typescript
type ZoteroNotePayloadKind =
  | "custom" | "conversation-note" | "digest"
  | "references" | "citation-analysis" | string;

type ZoteroNotePayloadBlock = {
  source?: "html-payload-block" | "embedded-image-attachment";
  sourceStorage?: "html-payload-block"
    | "embedded-image-attachment-v1"
    | "embedded-image-attachment-v2";
  payloadStorageVersion?: number;
  payloadHash?: string;
  anchorStatus?: "present" | "missing" | "stale" | "not_applicable";
  payloadType: string;
  noteKind: string;
  version: string;
  encoding: string;
  encodedValue: string;
  decodedText?: string;
  estimatedSize: number;
  payload?: unknown;
  markdown?: string;
  format: "markdown" | "json" | "text";
  errors?: string[];
  attachmentKey?: string;
  attachmentId?: number | string | null;
};

type ZoteroNotePayloadDetail = ZoteroNotePayloadBlock & {
  content: string;
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalChars: number;
  truncated: boolean;
};
```

---

## Encoding Strategies

### Inline HTML Encoding

Payloads are stored in `<span>` elements with custom `data-zs-*` attributes:

```html
<span data-zs-payload="digest"
      data-zs-version="1"
      data-zs-encoding="base64"
      data-zs-value="eyJ0ZXh0IjogImVuY29kZWQifQ==">
</span>
```

`listNotePayloadBlocks(noteHtml)` scans for these elements, decodes each
`data-zs-value` from base64, and returns `ZoteroNotePayloadBlock[]`.

### PNG Embedded Encoding

For larger payloads, the codec embeds data inside PNG images using a custom
`zsPL` chunk:

```typescript
function buildWorkbenchPayloadPngBytes(
  imageBytesInput: unknown,
  envelope: unknown,
): Uint8Array
```

1. Validates the input is a valid PNG (checks 8-byte PNG signature + `IEND`
   chunk presence).
2. Serializes the envelope as JSON.
3. Builds a custom PNG chunk with type `zsPL` containing the JSON bytes.
4. Inserts the chunk just before the `IEND` chunk.

Constants:
- `PNG_IEND = "IEND"` — marker used to locate the insertion point.
- `WORKBENCH_EMBEDDED_PAYLOAD_MARKER = "ZS_WORKBENCH_NOTE_PAYLOAD_V1:"` — V1
  fallback marker string.
- `WORKBENCH_EMBEDDED_PAYLOAD_CHUNK = "zsPL"` — V2 custom chunk type.

### V1 Fallback

`parseEmbeddedNotePayloadBlock(bytes)` tries V2 first (custom `zsPL` chunk),
then falls back to V1 (base64-encoded tail marker found after `IEND`).

---

## Payload Envelope

`buildWorkbenchPayloadEnvelope(args)` wraps a payload in a structured envelope:

```typescript
{
  schemaVersion: string;
  kind: string;         // WORKBENCH_EMBEDDED_PAYLOAD_MARKER
  createdAt: string;
  updatedAt: string;
  noteKey?: string;
  noteId?: number;
  parentId?: number;
  payloadHash: string;  // CRC32-based
  payload: unknown;     // The original payload
}
```

---

## Reading and Pagination

```typescript
function getNotePayloadDetail(
  noteHtml: unknown,
  args?: { payloadType?: string; offset?: number; maxChars?: number },
): ZoteroNotePayloadDetail
```

- `offset` — character offset to start reading from (default 0).
- `maxChars` — max characters to return (default `8000`, max `16000`).
- Returns the content slice with `nextOffset`, `hasMore`, `totalChars`, and
  `truncated` flags for client-side pagination.

Chunk size constants:
- `DEFAULT_PAYLOAD_CHUNK = 8000`
- `MAX_PAYLOAD_CHUNK = 16000`

---

## Note Construction

```typescript
function buildStructuredNoteContent(args: {
  noteKind: ZoteroNotePayloadKind;
  title: string;
  viewName: string;
  bodyHtml: string;
  payloadType: string;
  payload: unknown;
  payloadFormat?: "json" | "text";
}): string
```

Assembles a complete note HTML string with a `data-zs-note-kind` div, title
heading, view container, and an embedded payload block.

```typescript
function buildMarkdownBackedNoteContent(args: {
  title: string;
  markdown: string;
  noteKind?: "custom" | "conversation-note" | string;
  noteEntry?: string;
}): string
```

Builds note content from markdown:
- `"custom"` — uses `custom-markdown` payload type, renders markdown to HTML.
- `"conversation-note"` — wraps markdown in a versioned envelope with `path`
  field.

---

## Note Kind Detection

`parseNoteKind(noteHtml)` heuristically determines the note kind by scanning
for `data-zs-payload` attribute values, or falls back to `data-zs-note-kind`:

| data attribute value | Note kind |
|---------------------|-----------|
| `"digest"` | `digest` |
| `"references"` | `references` |
| `"citation-analysis"` | `citation-analysis` |
| `"conversation-note"` | `conversation-note` |
| (fallback) | `custom` |

---

## Decoding Pipeline

```
listNotePayloadBlocks(noteHtml)
  → scan for <span data-zs-payload="">
    → read data-zs-version, data-zs-encoding, data-zs-value
    → decodeBase64Utf8(data-zs-value)
    → projectDecodedPayload(payloadType, decodedText)
      → "digest"/"references"/"citation-analysis" → JSON parse
      → otherwise → text
    → return ZoteroNotePayloadBlock[]

parseEmbeddedNotePayloadBlock(bytes, attachment?)
  → V2: findPngChunk(bytes, "zsPL") → parse envelope → extract payload
  → V1: indexOfBytes(WORKBENCH_EMBEDDED_PAYLOAD_MARKER) → decode tail
  → return ZoteroNotePayloadBlock or null
```
