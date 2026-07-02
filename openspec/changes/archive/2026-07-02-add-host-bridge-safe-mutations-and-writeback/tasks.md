## 1. Spec

- [x] 1.1 Add proposal, design, tasks, and delta specs.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Host Bridge

- [x] 2.1 Add inbound file handle registry and upload endpoint.
- [x] 2.2 Add `collection.create` mutation preview/execute.
- [x] 2.3 Add uploaded-file attachment mutation preview/execute.
- [x] 2.4 Add annotation list/export read capabilities.
- [x] 2.5 Keep execute approval and ACP scoped auto-approval semantics.

## 3. CLI

- [x] 3.1 Add semantic mutation builders for tag, collection, item, note, and
  attach-file.
- [x] 3.2 Add read-only annotation commands.
- [x] 3.3 Add `file upload`.
- [x] 3.4 Add parser/body/path tests.

## 4. Surface/Profile

- [x] 4.1 Update surface catalog mappings.
- [x] 4.2 Update wrapper/profile semantic sources.
- [x] 4.3 Render Host Bridge surfaces.

## 5. Verification

- [x] 5.1 Run OpenSpec validation.
- [x] 5.2 Run Rust CLI tests.
- [x] 5.3 Run focused Host Bridge capability/server tests.
- [x] 5.4 Run doc/profile sync checks and packaging focused test.
