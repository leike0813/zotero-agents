# Tasks

- [x] Add delta specs for split runtime report outputs, structured artifact
      export rendering, and topic details report UI.
- [x] Remove `runtime/views/synthesis-report.md` generation and references from
      the split topic synthesis runtime and generated packages.
- [x] Rewrite split runtime report body generation so it emits business Markdown
      only, without internal runtime/storage prose.
- [x] Rewrite Host `current/export.md` rendering to use readable Markdown
      summaries and lists instead of JSON source dumps.
- [x] Render Topic Details report body as Markdown and hide internal section
      mapping fields.
- [x] Update focused runtime, apply/export, renderer, and UI tests.
- [x] Run focused mocha tests, `tsc --noEmit`, strict OpenSpec validation, and
      Prettier checks for changed files.
