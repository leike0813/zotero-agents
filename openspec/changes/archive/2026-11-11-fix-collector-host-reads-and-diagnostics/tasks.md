# Tasks

## 1. Snapshot annotation eligibility

- [x] 1.1 Extend the existing 102 Broker tests with mixed attachments and a genuine read failure; observe the eligibility regression fail, apply the guard, and pass both cases and the existing snapshot cases.
- [x] 1.2 Document attachment eligibility and preserved snapshot completeness in the Broker SSOT document; verify the description matches the tested behavior.

## 2. Collector Bridge launcher and query transport

- [x] 2.1 Extend the existing 173 runtime tests with platform selection, override/PATH behavior and lossless query transport, including real Windows CMD execution; observe regressions fail, implement platform candidates and UTF-8 stdin, and pass the runtime file.

## 3. Synthesis business diagnostics

- [x] 3.1 Extend the existing 220 composition tests for Host request rejection, sidecar rejection, response validation, single incident ownership and private diagnostic filtering; observe missing diagnostics fail, implement bounded safe projection, and pass the file.
- [x] 3.2 Document the optional diagnostic fields and privacy bounds in sidecar supervision documentation; verify they match the tests and preserve classifications.

## 4. Integration verification

- [x] 4.1 Run the three affected test files together, relevant TypeScript checks, targeted formatting/lint checks, and strict OpenSpec validation; inspect the final diff for scope and whitespace errors.

Validation: the 102, 173, and 220 test files passed together (208 passing;
2 existing POSIX-only cases skipped on Windows). Root and contracts TypeScript
checks, targeted ESLint and Prettier checks, strict OpenSpec validation, and
`git diff --check` passed. Build, deployment, and real-run recovery are outside
this change's acceptance.
