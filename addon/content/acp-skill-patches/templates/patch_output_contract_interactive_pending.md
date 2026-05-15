#### Pending Branch Contract

- Return the pending branch only when user input is genuinely required before the task can continue.
- `__SKILL_DONE__`: must be `false`.
- `message`: required non-empty string shown directly to the user.
- `ui_hints`: required object for optional rendering hints.
Supported `ui_hints.kind` values: `{kind_values}`.
- `ui_hints.prompt`: optional string for extra UI display text.
- `ui_hints.hint`: optional string for input guidance.
- `ui_hints.options`: optional array for `choose_one`; each item should include {options_fields}.
- `ui_hints.files`: optional array for `upload_files`; each item should include {files_fields}.
- Do not mix the final and pending branches in the same turn.

Pending branch example:

```json
{pending_example_json}
```
