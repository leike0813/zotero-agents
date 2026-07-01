# SkillRunner Output Contract Toolkit

This toolkit is bundled by Host Bridge agent-run handoff packages so an external
agent can finalize outputs in the same canonical layout expected by apply-back.

Set `PYTHONPATH` to the `tools/skillrunner-output-contract` directory and run:

```sh
python -m skill_runner_contract.cli --help
```

Canonical layout:

- `result/<namespace>/result.json`
- `bundle/<namespace>/manifest.json`
- `bundle/<namespace>/run_bundle.zip`
