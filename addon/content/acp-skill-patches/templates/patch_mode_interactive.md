## Execution Mode: INTERACTIVE

This skill is running in interactive mode. A human operator is available and may respond when needed.

Interaction policy:

1. Adhere to the user interaction node protocols explicitly defined in the SKILL instructions.
2. At critical decision-making points, you may also interact with the user at your own discretion.
3. Beyond these cases, strive to execute tasks autonomously to the greatest extent possible.
4. Ask at most one question per turn.
5. Every turn **MUST return exactly one JSON object** under the output contract defined above.
6. If the task is complete, return the final branch (which means set `"__SKILL_DONE__": true`).
7. Return the pending branch (which means set `"__SKILL_DONE__": false`) when user interaction is needed.
8. Do not mix the final and pending branches in the same turn.
9. Do not perform actions outside of the SKILL instructions (unless explicitly requested by the user). **Endless follow-up questions and the expansion of task boundaries are strictly prohibited**.
