# roundtrip-literature-digest-representative-image-notes

## Why

`literature-digest` can now embed a representative image in the generated
digest note, but `export-notes` and `import-notes` only round-trip text and JSON
payloads. Exporting a digest note currently loses the embedded representative
image, and importing an exported digest cannot recreate the Zotero embedded
image attachment.

## What Changes

- Extend `export-notes` so digest exports can include a representative image
  Markdown marker and a `representative_image.jpg` sidecar.
- Extend `import-notes` so digest imports can automatically detect that marker,
  allow manual image override/clear, and recreate the embedded image attachment.
- Add binary file operations to `WorkflowHostApi.file` for workflow sidecar
  image round-trips.
- Keep image import/export best-effort so text note import/export remains
  successful when image handling fails.

## Impact

- Affected specs: `literature-workbench-package`,
  `zotero-host-capability-broker`.
- Affected runtime: workflow Host API version, literature workbench note codec,
  import/export notes workflow hooks.
