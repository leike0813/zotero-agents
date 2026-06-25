# SkillRunner Host Bridge Env Injection

## Summary

Translate required Zotero Host Bridge access for SkillRunner HTTP backends into
generic `runtime_options.env` values instead of requiring SkillRunner to
understand `runtime_options.zotero_host_access`.

## Motivation

SkillRunner can inject environment variables into hosted jobs, but should not
need Zotero-specific request semantics. The plugin already knows the active
Host Bridge endpoint and token, so it can prepare a portable runtime
environment while keeping backend request contracts generic.

## Scope

- Keep `SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS = false`.
- Add `ZOTERO_BRIDGE_ENDPOINT` support to CLI config resolution.
- Let profiles declare optional `connectionMode: "local" | "remote"`.
- For SkillRunner HTTP `skillrunner.job.v1`, translate required host access to
  `runtime_options.env`.
- Use LAN remote endpoints derived from `advertisedHost:pinnedPort`.
- Document local ACP injection and remote SkillRunner env injection as separate
  paths.

## Out Of Scope

- Run-scoped Host Bridge tokens.
- Backend-side endpoint probing.
- WAN, relay, tunnel, or non-LAN Host Bridge access.
- Native SkillRunner understanding of `runtime_options.zotero_host_access`.
