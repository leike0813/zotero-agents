# Change: Preflight Runtime Command Resolution

## Summary
Move runtime command resolution for `uv`, Python, Node, npm, and npx into the shared platform layer. Resolve these commands once during plugin startup, store the result in memory for the current Zotero process lifetime, and reuse it for ACP launch and ACP Skills runtime dependency strategy selection.

## Motivation
ACP launch and ACP Skills runtime dependency handling currently duplicate command lookup logic. This makes `uv` behave like a hidden per-run dependency and spreads platform-specific PATH fallback rules across business modules. A startup-scoped command registry makes command availability explicit, stable for one plugin lifecycle, and reusable by transport and dependency probes.

## Scope
- Add a startup-initialized in-memory command registry for `uv`, Python, `node`, `npm`, and `npx`.
- Route ACP transport command lookup through the platform command service.
- Keep ACP chat behavior unchanged: no uv wrapping and no Python availability check.
- Use the startup registry only to choose ACP Skills runtime dependency strategy; still probe declared dependencies per job.
- Distinguish uv dependency preparation failures from system Python missing-package failures.

## Out of Scope
- Installing uv, Python, Node, npm, npx, or Python packages automatically.
- Persisting command resolution results across Zotero restarts.
- Refreshing the startup registry after the plugin has initialized.
