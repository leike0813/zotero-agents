# Zotero Librarian Hermes Profile

This profile gives Hermes agents a self-contained Zotero library management surface. It includes the `zotero-bridge` CLI, a Host Bridge profile example, a local SQLite index service, workflow catalog helpers, run monitoring helpers, cron templates, and the `zotero-librarian` skill.

Source project: [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents).

Install this profile from the published repository:

```shell
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

Use `assets/host-bridge/profile.example.json` as the Host Bridge profile template. Set `ZOTERO_BRIDGE_TOKEN` in the runtime environment; do not write tokens into profile files.

Local state defaults to `$HERMES_HOME/zotero-librarian/index.sqlite`. Set `ZOTERO_LIBRARIAN_STATE_DIR` to place state somewhere else.
