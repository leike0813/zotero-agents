# Zotero Librarian Hermes Profile

This profile gives Hermes agents a self-contained Zotero library management surface. It includes the `zotero-bridge` CLI, a Host Bridge profile example, a local SQLite index service, workflow catalog helpers, run monitoring helpers, cron templates, and the `zotero-librarian` skill.

Source project: [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents).

Install this profile from the published repository:

```shell
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

Use `assets/host-bridge/profile.example.json` as the Host Bridge profile template. Set `ZOTERO_BRIDGE_TOKEN` in the runtime environment; do not write tokens into profile files.

Run `scripts/install_zotero_bridge_cli.py` during profile initialization. The installer copies the packaged `zotero-bridge` binary and links the Hermes well-known Host Bridge profile path to the host `bridge-profile.json`, so normal `zotero-bridge` commands can find the active profile without changing `HOME`. If the host profile cannot be inferred, set `ZOTERO_BRIDGE_HOST_PROFILE` or pass `--host-profile` to the installer.

Local state defaults to `$HERMES_HOME/zotero-librarian/index.sqlite`. Set `ZOTERO_LIBRARIAN_STATE_DIR` to place state somewhere else.
