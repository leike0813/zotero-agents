# Tasks

- [x] Update specs for idle-only reachability, timeout classification, and degraded observation.
- [x] Extend SkillRunner connection governor with physical debt, skip counters, and degraded snapshot fields.
- [x] Fix SkillRunner management client response/stream release and default reachability probe behavior.
- [x] Update reachability registry for idle recovery mode and `15/30/60/120s` backoff.
- [x] Update reconciler so prompt reconcile does not wait for reachability and request-level timeout is non-terminal for backend reachability.
- [x] Reduce session/UI observation density and warm stream behavior under degraded mode.
- [x] Expose new reachability/debt fields in the debug connection audit view.
- [x] Add or update focused regression tests and run validation.
