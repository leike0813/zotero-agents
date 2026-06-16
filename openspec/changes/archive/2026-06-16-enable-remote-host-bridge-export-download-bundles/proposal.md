# Remote Host Bridge Export Bundles

## Summary

Remote Host Bridge CLI calls must not assume the SkillRunner backend can see the
same filesystem as Zotero. This change makes the two known direct-file export
capabilities deliver zip bundles through Host Bridge file handles when the CLI
profile declares `connectionMode: "remote"`.

## Motivation

`topics.get_context` with `outputPath` and
`paper_artifacts.export_filtered` currently write files on the host side. That is
correct for local ACP runs, but remote SkillRunner jobs need a portable delivery
mechanism. Host Bridge already has authenticated file handles, so remote exports
can be represented as zip bundles without introducing backend-specific
SkillRunner protocol handling.

## Scope

- Preserve local file-writing behavior for existing local profiles.
- Forward CLI profile `connectionMode` to Host Bridge capability execution.
- In remote mode, return `delivery.mode: "bridge-download"` plus a download
  command and unzip hint.
- Register generated zip files as `bridge-export` handles.
- Update Host Bridge CLI docs and wrapper skill guidance.

## Out of Scope

- Run-scoped tokens.
- Peer-address inference.
- Reverse tunnels or non-LAN transport.
- Generalizing every possible Host Bridge file output.
