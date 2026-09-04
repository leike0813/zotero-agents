## 1. Zotero 10 runtime compatibility

- [x] 1.1 Extend the XPI manifest and runtime-major parser for Zotero 10; verify manifest and parser tests cover 7, 9, 10, and unknown versions.
- [x] 1.2 Adapt library-tree selection at the shared context boundary; verify tests cover plural APIs, legacy fallback, unique scalar selection, and ambiguous multi-selection.

## 2. Content package and release scope

- [x] 2.1 Set Content Package 0.7.4 compatibility to plugin `>=0.8.0`, content API `^3.0.0`, and Zotero `>=7 <11`; verify the public installer accepts Zotero 10 and rejects out-of-range hosts.
- [x] 2.2 Prepare explicit stable/beta publication without overwriting unselected channels; verify release-script tests cover normalization, scoped assets, preserved feeds, and remote checks.

## 3. Documentation and validation

- [x] 3.1 Update the public support statements and regenerate embedded help docs; verify the generated-doc consistency check passes.
- [x] 3.2 Run focused compatibility/release tests, TypeScript checking, lint, build, and OpenSpec strict validation; record any unrelated full-suite failures separately.
