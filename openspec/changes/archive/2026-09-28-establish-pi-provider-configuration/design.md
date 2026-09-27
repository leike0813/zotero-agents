# Design

## Context

See proposal.md. The Backend Manager host controller resides in `src/modules/workflow/settings/backendManager.ts`; its page is compiled from `src/dashboard/` Preact source. Pi state must never enter `backendsConfigJson` or the BackendInstance registry.

## Goals / Non-Goals

**Goals:** Reuse the existing dialog and profile-scoped persistence, keep catalog and credentials as separate concrete owners, and make selection deterministic and secret-free.

**Non-Goals:** Provider execution, OAuth login, network probes, Assistant Workspace routing, or a generic provider interface.

## Decisions

- Pin the proven static `@oh-my-pi/pi-catalog/models` subpath and normalize it into project DTOs. `yaml` parses only an allowlisted declarative overlay. Cache only sanitized data under the existing runtime cache root, with a digest-based revision; failure preserves the previous valid cache.
- One Pi preference document holds configurations, defaults, and overlay path. A separate encrypted credential preference holds versioned records and redacted metadata. AES-GCM uses an independently generated profile key in existing `plugin_meta`, avoiding Host Bridge token rotation. The key is created only on first credential write.
- Configuration selection is pure and returns a frozen project DTO, including the opaque credential reference but no credential material. Incomplete configurations can be stored but cannot be defaults. With no scoped default, the catalog-backed fallback is the first enabled, usable configuration in persisted order whose configured model exists in the catalog. Local endpoint classification is recorded now; execution preflight in C04/C06 enforces Local Network capability.
- The Backend Manager snapshot adds a `builtinAgent` branch and page-specific actions. Existing `rows` and `save` remain the exclusive Backend Profile path. Page source, not generated JavaScript, owns the fourth region.

## Risks / Trade-offs

- Profile-local key and ciphertext do not defend against an attacker who can read the entire profile; OS keychain integration can later replace key custody without changing the credential contract.
- C03 cannot prove a provider is executable until C04 adds a stream adapter. The page reports configuration status rather than claiming model-call readiness.
