# Proposal: SkillRunner Handshake Protocol

## Summary

Add a SkillRunner handshake protocol so the plugin can confirm backend protocol capabilities before sending SkillRunner requests.

The local runtime feed remains responsible for selecting the managed local SkillRunner version. The handshake protocol covers self-hosted and managed backends at runtime by reporting whether a backend supports protocol IDs such as `skillrunner.job.v1` and `skillrunner.sequence.v1`.

## Motivation

The plugin can upgrade independently from SkillRunner. A self-hosted SkillRunner instance may not be upgraded when the plugin starts emitting a newer request protocol. Without a runtime handshake, the plugin can only discover incompatibility after sending an unsupported request.

The plugin needs a small capability boundary:

- Know whether a backend supports `skillrunner.job.v1` before sending existing job requests.
- Keep `skillrunner.sequence.v1` aligned with workflow declarations.
- Preserve current sequence execution, where the plugin decomposes sequence workflows into `skillrunner.job.v1` steps.
- Keep user flows automatic; users do not choose protocols during execution.

## Scope

This change adds:

- `POST /v1/system/handshake` request and response contract.
- Plugin-side management client support for the handshake endpoint.
- A cached SkillRunner capability resolver keyed by backend id and base URL.
- Legacy fallback for reachable SkillRunner backends without the handshake endpoint.
- Provider-side protocol checks before sending SkillRunner requests.
- Tests for handshake parsing, fallback, cache behavior, and provider preflight blocking.

This change does not add:

- Zotero version negotiation.
- API version negotiation beyond protocol IDs.
- SkillRunner semver range negotiation.
- User-selectable protocol channels or feature flags.
