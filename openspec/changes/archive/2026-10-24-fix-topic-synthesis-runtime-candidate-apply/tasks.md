# Tasks

## 1. Runtime candidate ownership at apply

- [x] 1.1 Add hook regressions for altered returned hashes, language and topic fields through local and bundle readers, and for missing/malformed declared candidates; observe baseline failures and passing regressions after the fix.
- [x] 1.2 Resolve the declared complete candidate through the shared bounded artifact reader before closed-request materialization; verify the hook submits captured values and makes no mutation for invalid candidates while existing cancellation/direct-input tests pass.
- [x] 1.3 Extend the existing native update-hook regression to capture the public audit basis, accept a correct candidate despite altered returned hashes, and refuse a stale candidate despite newer returned hashes; verify persisted content is unchanged by refusal.
- [x] 1.4 Align finalize renderer instructions, the generated Skill, workflow documentation and main specification; verify `npm run check:builtin-skill-contracts` reports five byte-identical packages.

## 2. Integration verification

- [x] 2.1 Run the existing workflow hook/client suites and native Topic mutation suite; verify 56 tests in suites 124/177 and 23 tests in suite 239 pass.
- [x] 2.2 Replay the original saved returned JSON through the fixed hook without live mutation; verify all three submitted hashes and the Topic definition equal the runtime candidate and 42 assets materialize successfully.
- [x] 2.3 Run `npx tsc --noEmit`, ESLint for the modified tests, Prettier for the eight changed implementation/documentation files, and `git diff --check`; verify each completes successfully. Hook/library/renderer paths are excluded by repository ESLint configuration.

## 3. Supplemental OpenSpec record

- [x] 3.1 Create proposal, design and the complete two-requirement delta; verify the delta matches the already synchronized main-spec blocks and retains every existing scenario.
- [x] 3.2 Run strict validation for this change and `synthesize-topic-workflow`, then verify artifact completeness and Markdown formatting.

## 4. Original-run recovery

- [x] 4.1 Prepare a temporary reapply payload from the saved runtime candidate with replace override, `persistResult: false` and `force: false`; verify the original result and canonical Topic are not modified during preparation.
- [x] 4.2 Connect to the original plugin-enabled Zotero Bridge and reapply the failed finalize request through the existing debug capability; verify apply succeeds, or stop and retain structured conflict evidence if the original basis is stale.
- [x] 4.3 Read back the canonical Topic and originating run; verify candidate content and `applyResultState: succeeded` before reporting recovery complete.

## Verification evidence

Implementation checks were executed before this supplemental change was created:

```powershell
npx tsx node_modules/mocha/bin/mocha tests/synthesis/124-synthesize-topic-workflow.test.ts tests/synthesis/177-synthesis-workflow-client.test.ts --require tests/setup/zotero-mock.ts --reporter dot --exit
npx tsx node_modules/mocha/bin/mocha tests/synthesis/239-synthesis-topic-mutations.test.ts --require tests/setup/zotero-mock.ts --reporter dot --exit
npm run check:builtin-skill-contracts
npx tsc --noEmit
npx eslint tests/synthesis/124-synthesize-topic-workflow.test.ts tests/synthesis/239-synthesis-topic-mutations.test.ts
git diff --check
```

Recovery remains pending: the Bridge endpoint was unavailable, and the launched Joshua-Side profile did not contain Zotero Agents. The temporary payload is ready; the original plugin-enabled instance must be identified or opened. No real Topic write, plugin build, release or Git commit was performed.

## Workflow follow-up

- Keep this change open while original-run recovery is outstanding.
- Archive, commit and publish only when separately requested.
