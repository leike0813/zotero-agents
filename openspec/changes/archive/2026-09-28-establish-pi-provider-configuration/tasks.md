# Tasks

## 1. Catalog and dependencies

- [x] 1.1 Pin static catalog and YAML parser dependencies; verify browser bundle resolves only the static catalog subpath.
- [x] 1.2 Write red tests, then implement normalized static catalog, strict read-only overlay, last-good cache, and stable revision; verify catalog tests in Node and Zotero.

## 2. Configuration and credentials

- [x] 2.1 Write red tests, then implement profile-scoped configurations, defaults precedence, endpoint validation, and frozen secret-free selections; verify configuration tests.
- [x] 2.2 Write red tests, then implement encrypted multi-record credential storage and redacted metadata; verify tamper, missing key, replace, and delete cases.

## 3. Backend Manager

- [x] 3.1 Add independent typed Pi snapshot/actions and fourth Preact page, with localization; verify stable UI test and existing Backend Manager regressions.
- [x] 3.2 Update Backend Manager documentation and living Pi handoff to match actual implementation; verify links and current status.

## 4. Integration evidence

- [x] 4.1 Run lint, build, Node suites and targeted real Zotero core/UI checks; record full Zotero suite waiver accurately.
- [x] 4.2 Run strict OpenSpec validation and official implementation verification, sync delta specs, then archive this change.
