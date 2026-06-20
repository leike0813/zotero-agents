# Tasks

- [x] 1. Migrate `skillrunner.job.v1` normal auto and interactive execution to foreground poll/fetch/apply.
- [x] 2. Treat `waiting_user` and `waiting_auth` as foreground detach boundaries with reply/auth foreground continuation.
- [x] 3. Migrate `skillrunner.sequence.v1` normal execution to a foreground step loop with step/root apply state convergence.
- [x] 4. Remove request-ready artificial defer support from SkillRunner provider/client paths.
- [x] 5. Fix foreground continuation state convergence so sequence step/root apply writes terminal apply states.
- [x] 6. Route sequence continuation through provider registry instead of direct SkillRunner client construction.
- [x] 7. Downgrade reconciler missing-context scanning to startup/backend-recovery/local-runtime one-shot boundaries only.
- [x] 8. Add missing-context terminal success guard so foreground apply state is not overwritten and no stale missing-context toast is emitted.
- [x] 9. Update SkillRunner SSOT docs, facts, and invariant checks for foreground apply and one-shot reconciler policy.
- [x] 10. Run OpenSpec validation, focused regressions, TypeScript, SSOT invariant check, and diff check.
- [x] 11. Hard-clean foreground orchestration: remove reconcile-owned normal-path API/model fields, drop old run payload compatibility, and keep `request_ready` as submit phase only.
- [x] 12. Dead code and defensive cleanup: remove unused recovery wrappers, share SkillRunner progress mapping, keep `request_ready` defensive writes as submit phase, and guard terminal apply against non-succeeded provider results.
- [x] 13. Downgrade reconciler to one-shot recovery handoff: remove long-lived context polling/apply ownership, hand recoverable runs to foreground continuation, and fail unrecoverable missing-context/ambiguous apply runs.
- [x] 14. Remove the unused deferred workflow completion tracker and de-dupe backend recovery sweeps while a backend handoff sweep is already in flight.
- [x] 15. Break SkillRunner backend health bootstrap deadlock: unknown backends are not filtered as flagged, backend settings saves sync health tracking, and empty ledger startup reconcile registers configured backends.
- [x] 16. Separate backend health tracking from reachability: configured backends are tracked as unconfirmed until a real successful backend operation marks them reachable.
- [x] 17. Replace the remaining SkillRunner reconcile flag health model with an enabled/reachable reachability state machine, idle-only probe coordinator, auto-disable policy, and unavailable-backend UI/task filtering.
