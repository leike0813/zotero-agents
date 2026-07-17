# Concrete Writeback

Use this journey only after the intended Zotero change is concrete and no semantic inference remains.

1. Reread each target item, note, collection, or attachment immediately before writing.
2. Use `mutation preview` for a generic mutation payload. For a simple known operation, use the semantic tag, collection, item, note, or attach-file command.
3. Present the target refs and proposed effects at the Host-owned approval boundary.
4. On approval, preserve the applied result and reread affected objects as completion evidence.

Use a workflow instead when the task still requires classification, generation, multi-step business logic, or a declared reusable contract. Navigation never substitutes for a mutation. Raw `call` never bypasses semantic validation or approval.

If a write response is uncertain, inspect `stateChanged` and `handleConsumed`. Do not blindly repeat. Reread the exact target and calculate the remaining delta. On denial, report no write and stop; a denial is not permission to choose another write path.
