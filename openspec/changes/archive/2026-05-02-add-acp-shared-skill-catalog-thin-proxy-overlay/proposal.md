# Add ACP Shared Skill Catalog Thin Proxy Overlay

## Summary

Change ACP SkillRunner-compatible skill governance from per-run full skill copies to a shared read-only skill catalog plus run-local thin proxy skills. Each ACP skill run still uses an isolated workspace and agent-family-specific skill roots, but the injected skill directories contain only patched `SKILL.md` files and a small proxy manifest. Heavy resources remain in the shared catalog and are referenced by absolute paths.

## Motivation

Copying complete skill packages into every ACP run workspace gives isolation, but it produces large duplicated workspaces and makes cleanup noisy. ACP runs need access to every effective plugin-side skill, not only the requested skill, while still preserving run-specific patching and output contracts.

## Scope

- Build a shared catalog from the plugin skill registry, with user skills overriding builtin skills.
- Generate a resource manifest for each effective skill.
- Inject all effective skills into each ACP run as patched thin proxies.
- Rewrite stable `scripts/`, `assets/`, and `references/` resource references in proxy `SKILL.md` to absolute shared catalog paths.
- Keep runtime dependency and output schema lookup rooted at the real catalog skill package, not the proxy directory.

## Non-Goals

- Do not change `skillrunner.job.v1`.
- Do not use symlinks, junctions, or global agent skill roots.
- Do not make thin proxies compatible with arbitrary dynamic relative path conventions.
- Do not change ACP chat behavior.
