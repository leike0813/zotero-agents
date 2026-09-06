# Selection Context

The plugin captures the exact ordered selection when a workflow is triggered. It finishes all Broker pages before locking the input; a selection change between pages fails the acquisition. Settings preview and execution share this locked input. Explicit and durable inputs use complete `{libraryId, key}` refs.

## Structure

`items` is one ordered array. Each fact has `kind`, `ref`, and `itemType`; `title` and `parentRef` are optional. Attachment facts may also expose `filename`, `contentType`, `createdAt`, and `fileState`. They contain no native objects, numeric item IDs, or local paths. An empty selection is `items: []`.

```ts
const selectionContext = {
  items: [
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACH01" },
      itemType: "attachment",
      title: "Paper.pdf",
      parentRef: { libraryId: 1, key: "PARENT01" },
    },
  ],
  sampledAt: "2026-09-06T00:00:00.000Z",
};
```

## Reading facts in hooks

A hook consumes its prepared unit. Read additional facts through `runtime.hostApi.library` with the locked ref. List reads are paged: consume `nextCursor` while `hasMore` is true. Do not sample the live selection again.

```js
export async function buildRequest({ selectionContext, runtime }) {
  const refs = selectionContext.items.map((item) => item.ref);
  const details = [];
  for (const ref of refs) {
    details.push(await runtime.hostApi.library.getItemDetail(ref));
  }
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: { titles: details.map((detail) => detail.item.title || "") },
  };
}
```

## Source files and task policies

Use declarative file sources when possible. The final local input adapter resolves `library.getItemDetail(ref)` and requires an attachment descriptor with `file.state === "available"` before using `file.path`. Selection, task metadata, and durable input keep attachment refs. Missing files fail preparation without replacing the source.

Promotion, deduplication, and source preference belong to the named selector in `validateSelection`, not acquisition. Literature selectors preserve one source per paper and Markdown/PDF preference; MinerU keeps directly selected PDFs exact and expands all eligible PDFs only for selected parents. `inputs.member` and `inputs.grouping` define the prepared units.

```json
{
  "inputs": {
    "member": { "kind": "attachment", "accepts": { "mime": ["application/pdf"] } },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [{ "kind": "source-file-exists", "phase": "availability" }]
  }
}
```

For an empty-input workflow use `member.kind: "selection"`, `grouping.mode: "all"`, the `selection` selector, and `trigger.requiresSelection: false`. Its selection requirements must allow empty input.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
