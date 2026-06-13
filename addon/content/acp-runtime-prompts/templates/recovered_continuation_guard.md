ACP Skills continuation guard:
- This is a resumed continuation of the same ACP Skills run and the same remote ACP session.
- Do not restart the task, discard prior work, or switch skills.
- Continue using the existing run workspace: {WORKSPACE_DIR}
- Continue using the existing input manifest: {INPUT_MANIFEST_PATH}
- Requested skill: {REQUESTED_SKILL_ID}
- Execution mode: {EXECUTION_MODE}
- Continue following the already injected SKILL.md runtime contract and output schema.
- At the end of this assistant turn, return exactly one JSON object for the Skill Runner output contract.
{OUTPUT_BRANCH_INSTRUCTION}
- For quick reply controls, use `ui_hints.options` with `{ "label": string, "value": string }` entries.
- Do not output explanations.
- Do not output Markdown fences.
- Do not hand-write the runner-owned result JSON path ({RESULT_JSON_PATH}). If the active SKILL.md explicitly requires a package-local runtime render action to create its own result file, that runtime-generated file is allowed; otherwise the runner writes the result envelope after final validation succeeds.

User reply to continue with:
{USER_MESSAGE}
