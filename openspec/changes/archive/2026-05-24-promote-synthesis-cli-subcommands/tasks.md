## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, synthesis CLI spec, and tasks.

## 2. Rust CLI

- [x] Add top-level `synthesis` command and kebab-case subcommands.
- [x] Map each Synthesis subcommand to its existing `synthesis.*` capability.
- [x] Reuse existing JSON input parsing and CLI output/error contracts.
- [x] Keep `call <capability>` as an advanced diagnostic command.

## 3. Documentation and Agent Guidance

- [x] Update `doc/host-bridge-cli.md` with the Synthesis command contract.
- [x] Update injected Host Bridge CLI prompt and run README templates.
- [x] Update create/update topic synthesis `SKILL.md` files.
- [x] Update create/update topic synthesis `runner.json` prompts.
- [x] Update create/update topic synthesis gate command examples.

## 4. Tests and Verification

- [x] Add Rust CLI help and mapping tests.
- [x] Run Rust CLI tests.
- [x] Run targeted Node Host Bridge CLI injection/packaging tests.
- [x] Validate OpenSpec change.
- [x] Run build.
