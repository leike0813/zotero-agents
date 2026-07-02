## 1. Spec

- [x] 1.1 Add OpenSpec proposal, design, tasks, and delta specs.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Host Bridge API

- [x] 2.1 Add restricted Zotero object navigation helpers.
- [x] 2.2 Add current context and selection REST endpoints.
- [x] 2.3 Add item, note, collection, and selection open REST endpoints.
- [x] 2.4 Add endpoints to Host Bridge manifest.
- [x] 2.5 Return stable navigation errors without exposing private paths,
  tokens, provider payloads, transcript, arbitrary URI, or eval.

## 3. CLI

- [x] 3.1 Add canonical `context current`.
- [x] 3.2 Add `context selection get` and `context selection open`.
- [x] 3.3 Add `context item open`, `context note open`, and
  `context collection open`.
- [x] 3.4 Add parser/path/body tests.

## 4. Surface and Profile

- [x] 4.1 Add context endpoint mappings to the surface catalog.
- [x] 4.2 Remove context read capabilities from raw-only drift classification.
- [x] 4.3 Update wrapper/profile semantic sources.
- [x] 4.4 Render Host Bridge surfaces.

## 5. Verification

- [x] 5.1 Run focused Host Bridge context/navigation tests.
- [x] 5.2 Run Rust CLI tests.
- [x] 5.3 Run `npm run check:host-bridge-doc-sync`.
- [x] 5.4 Run `npm run check:zotero-librarian-profile`.
- [x] 5.5 Run focused Host Bridge CLI packaging tests.
