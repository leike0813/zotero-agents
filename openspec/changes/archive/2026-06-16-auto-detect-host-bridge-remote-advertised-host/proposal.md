# Auto-detect Host Bridge Remote Advertised Host

## Summary

Remote SkillRunner Host Bridge access should not require users to manually fill
the Zotero host LAN address in normal LAN deployments. When a SkillRunner backend
URL is a remote LAN IPv4 address and no manual advertised host is configured, the
plugin will detect the local outbound LAN address used to reach that backend and
use it to build the injected Host Bridge endpoint.

## Problem

The current Host Bridge remote endpoint uses `hostBridgeAdvertisedHost` directly.
When the pref is empty, status exposes the `<zotero-host-ip>` placeholder. Remote
SkillRunner env injection correctly rejects that placeholder, but users see a
failure even though the plugin has enough information to derive the right LAN
source address for common IPv4 LAN cases.

## Goals

- Keep `hostBridgeAdvertisedHost` as an explicit manual override.
- Auto-detect the local IPv4 address for remote IPv4 SkillRunner backend URLs.
- Inject a concrete `ZOTERO_BRIDGE_ENDPOINT` for remote SkillRunner jobs when
  detection succeeds.
- Fail preparation with structured diagnostics when detection fails.
- Avoid leaking Host Bridge tokens in diagnostics.

## Non-Goals

- DNS, IPv6, VPN, or multi-hop route policy beyond best-effort IPv4 route
  detection.
- Backend-side reachability probing.
- Persisting the detected address into prefs.
- Changing ACP Host Bridge profile behavior.
