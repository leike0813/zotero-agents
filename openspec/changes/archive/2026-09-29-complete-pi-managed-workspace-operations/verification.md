# Verification

- Red: focused C08 tests failed because `materializeOrReuseMany` and `beginGeneratedTextOutput` were absent. Green: both passed; complete C08 Node file passed 10/10.
- `npm run test:node -- --shard runtime-provider-execution`: 10 files passed.
- `ZOTERO_TEST_GREP='Pi Trusted Native in real Zotero' npm run test:zotero:core`: 2/2 passed with batch source copy and generated NDJSON on the real host.
- `npm run test:zotero:core`: 80/80 passed.
- `npx tsc --noEmit`, `npm run lint:check`, `npm run build`, and `openspec validate complete-pi-managed-workspace-operations --strict`: passed.
- Completeness: 7/7 tasks; modified requirement and five scenarios have implementation and test or host evidence. Correctness: batch admission/manifest commit and staged-output terminal states match the delta. Coherence: the existing owner lock, manifest, filesystem adapter, and generated promotion remain the only owners.
- Main `pi-trusted-native-execution` spec was synced before archive. No new dependency or manifest version.
