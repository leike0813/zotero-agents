## 1. Re-establish the regression boundary

- [x] 1.1 Record the failing Core 183/185 source-worker baseline and confirm `ERR_MODULE_NOT_FOUND` points to `topicGraphCore.js`.
- [x] 1.2 Restore the deleted direct Topic Graph source Worker fixture and Core 190 parity canary, then confirm the canary fails for the same resolution defect.

## 2. Restore source/build parity

- [x] 2.1 Change the Topic Graph index runtime import and re-export to reference the source-owned `.ts` module without adding a JavaScript shim.
- [x] 2.2 Run Core 183, 185, and 190 and confirm source Worker results equal direct engine results.

## 3. Verify compiled and packaged behavior

- [x] 3.1 Run engine, contracts, application, service, and root TypeScript checks plus the Synthesis service build.
- [x] 3.2 Confirm emitted `topicGraphIndex.js` references only `topicGraphCore.js`, then run Core 193/195 and verify the `108 methods / 1 direct consumer` inventory.

## 4. Close focused quality gates

- [x] 4.1 Run service-boundary and Synthesis invariant checks plus focused ESLint and Prettier validation.
- [x] 4.2 Run `git diff --check`, strict OpenSpec validation, and final scope review confirming no dependency, database, runtime asset, or unrelated workspace changes.
