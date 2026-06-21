# Tasks

- [x] Add OpenSpec delta for SkillRunner submission context SSOT.
- [x] Add shared SkillRunner submission-context builder for sequence step jobs and skill display resolution.
- [x] Persist sequence step `skillName` in sequence state and emit it from initial and continuation progress events.
- [x] Replace duplicate sequence step job construction in run seam and foreground continuation with the shared builder.
- [x] Ensure single SkillRunner enqueue still writes skill display metadata through the shared helper.
- [x] Add tests for initial sequence step metadata, continuation step metadata, and no UI-side registry fallback.
- [x] Run type checks, focused tests, and OpenSpec validation.
- [x] Preserve provider options, derived engine, execution mode, and input identity in foreground sequence continuation jobs.
- [x] Add regression coverage for interactive foreground continuation carrying the full submission context.
