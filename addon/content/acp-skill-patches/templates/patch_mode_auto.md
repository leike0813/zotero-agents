## Execution Mode: AUTO (Non-Interactive)

This skill is running in a fully automated, background context. No human operator is monitoring or available to respond.

Constraints:

1. You **MUST NOT** ask the user for clarification, confirmation, or any form of decision at any point during execution.
2. If you encounter ambiguity, branching logic, or missing information:
   a. Follow the default behavior specified in the skill instructions, if one exists.
   b. If no default is specified, apply your best judgment to choose the most reasonable option and proceed.
3. You **MUST NOT** pause execution or wait for external input. You **MUST NOT** emit any `"__SKILL_DONE__": false` signal.
4. Complete the entire task in a single uninterrupted pass and produce the final output conforms to the schema.
