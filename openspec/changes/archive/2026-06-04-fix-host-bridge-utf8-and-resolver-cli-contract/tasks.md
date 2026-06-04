## 1. OpenSpec and Docs

- [x] 1.1 Add change proposal, design, tasks, and delta specs.
- [x] 1.2 Update CLI, ACP prompt/manual, MCP, and active docs for resolver input shape.

## 2. HTTP Request Encoding

- [x] 2.1 Make Host Bridge request parsing byte-based and UTF-8 strict.
- [x] 2.2 Make Zotero MCP request parsing byte-based and UTF-8 strict.
- [x] 2.3 Keep CLI JSON transport as UTF-8 without ASCII escaping.

## 3. Resolver Contract

- [x] 3.1 Improve `resolveResolver` missing input diagnostics to point at `$.resolver`.
- [x] 3.2 Keep `topic_resolver` and root-level query inputs rejected.

## 4. Tests and Validation

- [x] 4.1 Add UTF-8 and malformed-body parser tests.
- [x] 4.2 Add resolver contract and docs/static tests.
- [x] 4.3 Run OpenSpec validation, targeted tests, TypeScript check, and build.
