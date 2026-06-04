## Design

LAN binding still listens on `0.0.0.0`, but remote clients need a concrete host. Host Bridge status therefore exposes a `remoteEndpoint` derived from an advertised host preference. If the user has not configured one, the remote endpoint uses `<zotero-host-ip>` as an explicit placeholder.

The master token is independent from the auto-rotating local token. It is stored as an AES-GCM encrypted prefs envelope, with a stable local key material pref used only for key derivation. This protects against accidental plaintext prefs exposure but is not an OS keychain.

Authentication accepts either the current local token or the decrypted master token. Manifests and status snapshots only show masked token state. Copy actions return plaintext only to the preferences UI event handler so it can write to the clipboard.

File downloads remain path-safe: clients can only download broker-issued opaque `fileId` handles. Remote support is achieved by using the remote profile endpoint and master token; no arbitrary filesystem endpoint is added.
