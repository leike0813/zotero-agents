# Design: Preflight Runtime Command Resolution

## Command Registry
The platform command service owns a process-local registry keyed by command name. Startup preflights `uv`, `python`, `python3`, `py`, `node`, `npm`, and `npx`, recording availability, resolved path, checked candidates, source, and diagnostic text. Failed resolutions are stored as data and do not abort startup.

## ACP Launch
ACP transport resolves backend commands through the platform command service. Startup-cached commands are reused for known runtime commands, while custom backend commands still use the same resolver on demand. Launch semantics stay unchanged.

## Runtime Dependencies
`runtime.dependencies` strategy selection uses startup command availability:

- If uv is available, the per-job probe runs `uv run --isolated --with ... -- python --version`. Success wraps the backend with uv. Failure is `uv_dependency_resolution_failed` and does not fall back to system Python.
- If uv is unavailable and Python is available, the per-job probe verifies the declared dependencies in that Python environment. Success uses the original backend. Failure is `system_python_dependencies_missing`.
- If neither strategy is available, the run fails with `runtime_dependency_strategy_unavailable`.

The probe details separate startup command availability from per-job dependency readiness.
