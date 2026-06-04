## Why

Remote Host Bridge clients need a stable endpoint and credential. The current LAN mode can run on a random port, and the existing bearer token rotates automatically, which makes remote CLI profiles brittle. File download handles already use the Host Bridge endpoint, but the manifest and docs do not clearly state the remote-client path.

## What Changes

- LAN mode requires a fixed port and does not silently fall back to random ports.
- Host Bridge gains a manually rotated encrypted master token that can be copied into a remote CLI profile.
- Manifest/status expose remote endpoint hints and remote-download metadata without leaking plaintext tokens.
- Preferences UI adds advertised host, master token, and remote profile copy controls.

## Impact

- Affected specs: `host-bridge-cli-interface`, `host-bridge-cli-synthesis-subcommands`, `zotero-host-broker-capability-api`, `zotero-mcp-tool-suite`.
- Affected code: Host Bridge auth/server, preferences pane, CLI/docs/tests.
