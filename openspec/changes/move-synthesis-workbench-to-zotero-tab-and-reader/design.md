# Design: Synthesis Workbench Tab And Reader

## Tab Host

The plugin owns a singleton `synthesis-workbench` Zotero tab. Entry points call `openSynthesisWorkbenchTab()`, which selects an existing tab when present or creates a new tab with `Zotero_Tabs.add({ id, type, title, onClose })`.

The tab container hosts a Zotero chrome `browser` when available and falls back to an iframe-like element only for non-Zotero test environments. The browser loads `chrome://zotero-skills/content/synthesis/index.html`.

The host keeps the bridge state and message listener lifecycle. Tab close removes the message listener and clears frame/window references.

## Bridge

The bridge keeps the existing action protocol:

- frontend to host: `synthesis:action`
- host to frontend: `synthesis:init`
- host to frontend: `synthesis:snapshot`

Artifact reader payloads use a host-to-frontend message:

- host to frontend: `synthesis:artifact`

The artifact DTO includes `topicId`, `title`, `markdown`, `metadata`, `hash`, and `updated_at`. It does not include canonical filesystem paths.

## Reader

The frontend adds a reader view in the same Workbench app. Opening an artifact sends `hostCommand.openCanonicalMarkdown`; the host reads canonical content via `readTopicArtifact({ topicId })`, updates UI state to reader view, sends a snapshot, and then sends the artifact DTO.

Reader controls:

- Back to Artifacts
- Refresh
- Copy Markdown
- Open Folder

`Open Folder` remains a host command because it intentionally crosses into the operating system. Ordinary artifact opening never calls external editors.

## Markdown Rendering

The synthesis page loads the same local vendor assets as dashboard Markdown views:

- `markdown-it`
- KaTeX
- `markdown-it-texmath`

The renderer disables raw HTML, enables links/tables/lists/code blocks through Markdown-it defaults, and sanitizes rendered link targets before inserting HTML.
