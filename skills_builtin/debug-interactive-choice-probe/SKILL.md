---
name: debug-interactive-choice-probe
description: Debug-only interactive probe that asks one multiple-choice question, accepts any reply, and then finishes with a result JSON.
---

# Debug Interactive Choice Probe

This skill is only for Zotero Skills debug workflows. Do not write Zotero
items, notes, preferences, or external files.

Run only in interactive mode.

## Behavior

1. On the first assistant turn, ask the user one question and stop by returning
   the pending branch JSON exactly once.
2. The pending question must use `ui_hints.kind = "choose_one"` and provide
   three options.
3. After any user reply, finish the task. Do not ask another question.
4. The final result must be a single JSON object with `__SKILL_DONE__` set to
   `true` and must match `assets/output.schema.json` after the marker is
   removed by the runtime.

## Pending Output

Use this exact pending shape on the first turn:

```json
{
  "__SKILL_DONE__": false,
  "message": "Debug interactive probe: choose any option to continue.",
  "ui_hints": {
    "kind": "choose_one",
    "prompt": "Choose any option. The workflow will finish regardless of your answer.",
    "hint": "Any answer is accepted.",
    "options": [
      "Alpha",
      "Beta",
      "Gamma"
    ]
  }
}
```

## Final Output

After the user replies, return JSON matching this shape:

```json
{
  "__SKILL_DONE__": true,
  "kind": "debug_interactive_choice_probe_result",
  "ok": true,
  "accepted_any_reply": true,
  "message": "Debug interactive probe completed after one user reply.",
  "warnings": []
}
```

Do not include prose outside the JSON object.
