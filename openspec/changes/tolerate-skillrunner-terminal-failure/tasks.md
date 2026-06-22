## 1. Failure Classification

- [ ] 1.1 Identify all SkillRunner foreground paths that convert provider or sequence step errors into terminal `failed` state.
- [ ] 1.2 Add a shared classification for local observer failures such as network, disconnect, or shutdown-path errors after a backend request id is known.
- [ ] 1.3 Preserve backend-confirmed `failed` and `canceled` outcomes as terminal states.

## 2. Runtime Settlement

- [ ] 2.1 Update single-job dispatch failure handling so tolerated observer failures keep recoverable non-terminal state.
- [ ] 2.2 Update SkillRunner sequence step failure handling so tolerated observer failures do not mark the step or parent sequence terminal `failed`.
- [ ] 2.3 Ensure tolerated observer failures emit diagnostic runtime logs without broadening recovery scan inputs.

## 3. Verification

- [ ] 3.1 Add focused regression coverage for a SkillRunner request that has a request id and then hits a local observer network failure.
- [ ] 3.2 Add focused regression coverage for a SkillRunner sequence step that has a request id and then hits a local observer network failure.
- [ ] 3.3 Verify backend-confirmed failed/canceled states still settle terminal and stop sequence continuation.
- [ ] 3.4 Run the smallest relevant test subset for job queue, sequence runtime, and SkillRunner recovery boundaries.

## 4. Follow-up Boundary

- [ ] 4.1 Document any remaining sequence step projection gaps discovered during implementation as follow-up work, without adding backend-wide recovery scanning to this change.
