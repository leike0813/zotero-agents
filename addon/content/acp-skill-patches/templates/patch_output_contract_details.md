### Output Contract Details

#### Final Branch Contract

- Return the final branch when the requested task is fully concluded.
- Set `__SKILL_DONE__` to `true`.
- Include the required result fields defined below.
- Do not emit pending-only interaction fields in the final branch.

#### Field-Level Schema Details

The final branch fields must conform to the following schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
{field_rows}

Output schema path: {output_schema_path}

#### Final Branch Example

```json
{example_json}
```

{pending_branch_block}
