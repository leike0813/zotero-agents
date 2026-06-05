# Step 11 Render And Validate

`validate_final_artifacts` is the only path that writes `result/final-output.candidate.json`.

The runtime validates section schema, evidence closure, registered sidecars, source artifact hashes, operation-specific output fields, and final envelope shape. The final candidate contains `__SKILL_DONE__: true`; the runner validates stdout and writes the accepted result.
