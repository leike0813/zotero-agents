## Why

Dashboard, Workspace, Assistant, and Synthesis currently mix hand-drawn SVGs, CSS pseudo-element icons, and local mask assets. This makes icon behavior inconsistent and leaves the Workspace sidebar toggle unable to communicate open/closed state clearly.

## What Changes

- Introduce a local vendored Material Symbols SVG subset for first-party browser UI action icons.
- Replace hand-drawn Dashboard workflow icons, Dashboard main tab icons, Workspace shell icons, Synthesis navigation/control icons, and Assistant plain/bubble view icons with the shared icon layer.
- Add a Workspace shell `sidebarOpen` read-only projection so the right-side sidebar toggle can use distinct open/close labels and icons.
- Preserve Zotero host integration and brand assets such as toolbar PNGs, tab icons, favicons, and toast icons.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-skills-visual-theme`: first-party browser UI surfaces use one vendored Material Symbols subset for action icons while preserving brand/host icons.

## Impact

- Affects browser UI assets under `addon/content/shared`, `addon/content/icons`, Dashboard, Workspace, Assistant panel pages, and Synthesis Workbench.
- Affects Workspace shell snapshot shape only by adding the optional read-only `sidebarOpen` projection.
- No dependency installation, backend protocol change, workflow contract change, or Zotero toolbar icon replacement.
