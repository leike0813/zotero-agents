## Fixed baseline

- Commit: `aa44a7a25dbb7c4ea262fa78793f00b8219dcfb1`
- Recorded: 2026-07-25 before source edits.
- `skills_builtin/zotero-bridge-cli/SKILL.md`: 206 physical lines, 135
  substantive instruction lines, 17,810 normalized prose characters.
- `skills_builtin/zotero-bridge-cli/references/command-catalog.md`: 377 physical
  lines, 281 substantive instruction lines, 22,394 normalized prose characters.
- `skills_src/zotero-bridge-cli/SKILL.md`: 206 physical lines, 135 substantive
  instruction lines, 17,810 normalized prose characters.
- `skills_src/zotero-bridge-cli/references/command-catalog.md`: 77 physical lines,
  52 substantive instruction lines, 5,636 normalized prose characters.

The recorded values are measured with the repository's current
`instructionMetrics` algorithm. They replace the stale estimates in the handoff plan;
the baseline ref and preservation rule are unchanged.

## Approved runtime payload removal inventory

1. `paper_artifacts.read` bulk inline `payload`, `markdown`, and `decoded_text`.
2. Annotation export's duplicate complete Markdown plus annotations output.
3. Topic review-input's complete inline object.
4. Workflow submit's bulk `jobIds` and `tasks` detail.
5. Agent-run/apply bulk request and result detail.

Each removed payload must remain retrievable through bounded pagination or verified
file delivery. The instruction deletion inventory is empty.

## Required final counts

- `unmapped = 0`
- `downgraded = 0`
- `unauthorized dropped = 0`
- `intra-package duplicate = 0`
