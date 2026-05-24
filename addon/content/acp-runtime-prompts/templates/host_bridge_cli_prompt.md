[Zotero Host Bridge CLI]
Use the run-local command `./.zotero-bridge/bin/zotero-bridge` for Zotero host access when available.
For detailed command formats, output schemas, errors, approval rules, and safety boundaries, read the workspace manual at `{README_PATH}` before using the CLI.
Run `./.zotero-bridge/bin/zotero-bridge --help` or subcommand `--help` to self-discover commands.
Prefer semantic commands such as `item search`, `item get`, `note get`, `note payload`, `synthesis <subcommand>`, and `literature ingest`.
For searched literature ingest, write one JSON payload file per confirmed paper and run `./.zotero-bridge/bin/zotero-bridge literature ingest --input @runtime/payloads/ingest-paper-001.json` once per paper. Each payload must contain a single `paper` field; do not use `papers` batch payloads.
Use `file download <fileId> --output <path>` only for broker-issued file handles.
Parse stdout as exactly one JSON object. Do not print or expose token values.
Profile: {PROFILE_PATH}
{CLI_UNAVAILABLE_LINE}
[/Zotero Host Bridge CLI]
