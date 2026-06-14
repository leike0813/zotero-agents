# Tasks

- [x] Add delta spec for prompt cancel and ACP-visible backend error governance.
- [x] Extend ACP adapter prompt outcomes with cancel and visible backend error capture.
- [x] Short-circuit interrupted prompt turns and backend prompt errors before output convergence.
- [x] Tighten ACP Skills composer projection so current-turn cancel is exposed only for active prompt turns.
- [x] Add focused regression tests for adapter, runner, and UI projection behavior.
- [x] Run strict OpenSpec validation and focused TypeScript/test checks.
- [x] Narrow provider `session/update` prompt error classification so failed tool updates remain output-governed.
- [x] Treat current-turn interrupt as a user-replyable deferred state so sequences do not continue downstream.
