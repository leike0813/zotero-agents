# Verification

Status: implementation complete; ready for OpenSpec verification and archive.

## Confirmed

- `openspec validate add-pi-trusted-native-execution --strict` passed.
- The C07 async-classifier test failed before implementation and then passed with the existing Gateway tests.
- `npm run test:node -- --shard runtime-provider-execution` passed: 8 files including the 8 C08 Node tests and the C07 async-classifier regression.
- C08 Node tests exercised path traversal and links, file read/write/edit and small image result, restricted search and ignore rules, Shell classification and replacement environment, bounded uncertain teardown, materialized-file reuse, and generated output.
- `ZOTERO_TEST_GREP='Pi Trusted Native in real Zotero' npm run test:zotero:core` passed on Linux with restricted filesystem and native Shell canaries: 2 passed.
- The same targeted command passed on Windows Zotero 10.0.2: 2 passed. The restricted catalog performed a real file write/read; the trusted catalog ran PowerShell and rejected a Windows junction during file admission. Windows `nsILocalFileWin.getWindowsFileAttributes()` is not scriptable, so path inspection now reads `GetFileAttributesW` through Gecko's js-ctypes and rejects reparse points on each existing path segment.
- `npm run build` and `npm run lint:check` passed after the Windows path fix. The build-generated help-docs timestamp was restored to its tracked value.
- `npm run build` passed after the C08 implementation. The generated help-docs timestamp was restored to its original tracked value afterward.
- `npm run lint:check` passed in a separate run after build. TypeScript passed as part of build. Strict OpenSpec validation passed after documentation updates.

## Limits and test history

- The Windows `runtime-provider-execution` Node shard fails in five existing Linux-oriented cases: two symlink fixtures require a privilege unavailable to this Windows user, and three mock Shell cases expect `bash`. The Windows real-Zotero canary and build passed; this shard failure is not a passing Windows Node receipt.
- The first `runtime-provider-execution` run failed because the 4-second bounded teardown test exceeded the shard's default 2-second Mocha timeout. Its test timeout was raised to 10 seconds; the final shard run passed. The first parallel lint/build attempt raced with generated help-docs; the final lint run was separate and passed.
- An intermediate Linux Zotero canary failed after path inspection was tightened: `nsIFile.isSymlink()` throws for a new path. The missing-path branch now distinguishes that case while still checking links; the final Linux canary passed 2/2. Final build and lint were rerun after this fix and passed.
- Gateway bounds one result to 1 MiB, so C08 returns small images up to 700 KiB as a typed base64 JSON image value. Model image projection and larger-image handling remain open for owner integration.
- `package.json` and `package-lock.json` pin the direct production `ignore` dependency to 7.0.5. The existing local `node_modules` still supplies transitive `ignore` 5 during these checks; dependencies were not reinstalled in this task, so the installed 7.0.5 package has no local runtime receipt.
- The user approved targeted C08 Node and real-Zotero gates, including Windows, as an exception to the existing blocked full suites. Neither full Node nor full Zotero core has a passing C08 receipt.
