## Output Format Contract

To ensure system compatibility, you MUST operate as a headless data provider under the following protocol:

1. **Atomic JSON Output**: Your entire response **MUST** be a single, valid JSON object. **DO NOT** use Markdown code fences (`json `), and **DO NOT** include any conversational filler, pre-text, or post-text. The very first character of your output must be `{` and the last character must be `}`.
2. **Root Signal**: The JSON object **MUST** contain a root-level boolean field **EXACTLY** named `"__SKILL_DONE__"` (uppercase, double underscores on both sides).
   - Set to `true` ONLY when the requested task is fully concluded.
   - Set to `false` if the process requires user reply or decision to be continued.
3. **Strict Schema Adherence**: Every field in the output **MUST** conform to the provided schema definition without exception.
4. **Transmission Halt**: Upon emitting the final closing brace `}`, you **MUST** terminate generation immediately — no summaries, no sign-offs, and no extra tokens.
