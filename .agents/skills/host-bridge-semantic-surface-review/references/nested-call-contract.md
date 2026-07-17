# Nested Call Contract

The Host Bridge release pipeline calls this skill before rendering Host Bridge surfaces.

## Pipeline Entry

The release pipeline should call this skill when changed files include Host Bridge capability, endpoint, Agent Control Contract, CLI identity/error surface, workflow control or execution modes, apply receipts, workflow catalog, release identity contracts, OpenSpec Host Bridge specs, shared control facts, CLI wrapper, Zotero Library Agent, or Zotero Librarian profile semantic source files.

The first command inside this skill is:

```powershell
npx tsx scripts/host-bridge-semantic-review-context.ts
```

## Return Shape

Report the result in plain text with these fields:

```text
semantic review ran: yes
context reviewRequired: true|false
semantic source edits: <file list or none>
surface boundary result: independent|blocked
agent control contract result: aligned|blocked
release identity result: aligned|blocked
alignment result: aligned|edits applied|blocked
next commands: <render/check commands>
blocker: <only when blocked>
```

## Responsibilities

This skill may edit semantic sources when review finds a mismatch. It keeps on-demand agent policy independent from resident profile maintenance policy.

This skill must not publish releases, run GitHub workflows, sync prebuilds, or treat generated output as source-of-truth content.

The release pipeline remains responsible for rendering, checks, publication, release workflow tracking, and final reporting.
