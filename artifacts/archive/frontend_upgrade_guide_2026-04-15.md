# Frontend Structured Output Upgrade Guide

## What changed

Structured-output display is now backend-driven.

- `assistant.message.final.data.text` is still preserved as the raw/compat field.
- `assistant.message.final.data.display_text` is now the backend-projected display text.
- `assistant.message.final.data.display_format` tells you how the projected text should be rendered.
- `/chat` and `/chat/history` are derived from that projected display text.

The frontend should therefore stop parsing structured JSON out of chat content.

## Chat vs prompt-card split

### Pending branch

- chat shows the pending `message`
- prompt card shows:
  - `ui_hints.prompt`
  - `ui_hints.hint`
  - `ui_hints.options`
  - `ui_hints.files`
- prompt card does **not** repeat `message`

### Final branch

- chat shows the final payload rendered by the backend
- `__SKILL_DONE__` is not shown to the user
- the final summary card is still kept
- the final summary card shows task status only
- the final summary card must not repeat the final chat message
- the final summary card must not directly render the final structured payload

## Fallback behavior

### Pending repair/fallback

- chat shows the final fallback output or error text
- prompt card degrades to the default `open_text + DEFAULT_INTERACTION_PROMPT` shape

### Final repair/fallback

- chat shows the final fallback output or error text
- no prompt card should repeat that content
- the final summary card may still remain visible as a status surface
- the final summary card must not repeat the fallback output or error text

## Frontend implementation rule

- use `/chat` for conversation content
- use `/interaction/pending` for prompt-card interaction hints
- keep the final summary card as a status-only surface
- do not dispatch on `__SKILL_DONE__` in frontend code

## Files touched in this upgrade

- `e2e_client/templates/run_observe.html`
- `server/assets/templates/ui/run_detail.html`
- `docs/developer/frontend_design_guide.md`
- runtime projection / chat replay code under `server/runtime/`
