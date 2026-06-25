# Design

## Advertised Host Resolution

Host Bridge remote SkillRunner env construction resolves advertised host in this
order:

1. Manual pref/status value when it is non-empty and not the placeholder.
2. Auto-detected outbound local IPv4 address for the SkillRunner backend host.
3. Failure with diagnostics.

The detected value is used only for the current env injection. It is not written
to `hostBridgeAdvertisedHost`.

## Route Detection

The detector accepts an IPv4 literal backend host and returns a local IPv4
candidate plus diagnostics. It uses existing subprocess support:

- Windows: `powershell -NoProfile -Command Find-NetRoute -RemoteIPAddress <ip>`.
- Linux: `ip -j route get <ip>`, falling back to `ip route get <ip>`.
- macOS: `route -n get <ip>` to find the interface, then
  `ipconfig getifaddr <iface>`.

Candidates are rejected if empty, loopback, wildcard, or not IPv4.

## Env Injection

`buildSkillRunnerHostBridgeRuntimeEnv` becomes async because route detection may
spawn subprocesses. Workflow preparation awaits env construction before adapting
requests. The request wire shape is unchanged except successful remote requests
now use the detected host in `ZOTERO_BRIDGE_ENDPOINT`.

## Diagnostics

Failures include sanitized details such as backend URL/host, locality,
advertised host source, detected host, remote endpoint, bind mode, LAN state,
pin-port state, and detector diagnostics. Tokens are not included.
