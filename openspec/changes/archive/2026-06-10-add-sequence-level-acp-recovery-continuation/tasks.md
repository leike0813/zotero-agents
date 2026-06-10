# Tasks

- [x] Add OpenSpec change documents and the formal sequence recovery state
      machine document.
- [x] Add Host-only sequence state storage for step request ids, outputs, and
      terminal status.
- [x] Update sequence runtime to persist state and return recoverable deferred
      results.
- [x] Store sequence step metadata on ACP skill run records.
- [x] Route recovered non-final ACP step success into sequence continuation and
      keep final-step recovery on workflow apply.
- [x] Extend focused runtime and ACP recovery tests.
- [x] Run focused mocha tests, `tsc --noEmit`, and strict OpenSpec validation.
