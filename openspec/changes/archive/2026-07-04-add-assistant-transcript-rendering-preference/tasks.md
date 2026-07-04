## 1. Preferences

- [x] Add a default-on transcript pagination/virtualization preference key.
- [x] Add a User Interface preferences section between Backends and Agent
      Interface.
- [x] Move Markdown Reader and live rendering controls into the User Interface
      section.
- [x] Rename the Host Bridge section title to Agent Interface across locales.

## 2. ACP Skills Integration

- [x] Expose the preference on ACP Skills snapshots.
- [x] Cache the preference by transcript request scope in the ACP Skills child.
- [x] Disable virtualized rendering and scroll page requests for newly loaded
      scopes when the preference is off.

## 3. Tests and Validation

- [x] Cover preferences page placement and persistence.
- [x] Cover ACP Skills source integration and request-scoped behavior.
- [x] Run OpenSpec validation, focused UI/core tests, formatting, and TypeScript.
