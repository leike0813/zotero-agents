# Native Pi core × OMP pi-ai Zotero prototype

Issue [#35](https://github.com/leike0813/zotero-agents/issues/35) asks one specific question: can the upstream native `@earendil-works/pi-agent-core` stay as this project's Agent core while a Zotero-owned `StreamFn` adapter supplies `@oh-my-pi/pi-ai` and its catalog inside Zotero 7 and Zotero 9?

The prototype separates two results:

- **The mixed seam works.** Native Pi core drove an OMP `pi-ai` mock through the project-owned adapter, executed a tool, continued to a second model turn, and finished in both Zotero generations. The emitted bundle contains native Pi core and OMP `pi-ai`, but no OMP Agent core.
- **The published OMP production provider does not pass admission.** Both OMP `streamSimple` and the OpenAI Responses provider reach Node/Bun-only modules under a strict Firefox 115 bundle. The package set therefore remains **no-go for production embedding at `18.0.11`**, for this narrower reason.

See [RESULTS.md](./RESULTS.md) for the evidence and decision boundary.

## Contents

- `src/ompPiAiStreamAdapter.ts` is the minimal native-Pi-to-OMP-`pi-ai` ABI bridge.
- `src/probe.ts` runs the native Agent tool loop, abort propagation, catalog enumeration, API-key forwarding, and declarative overlay checks.
- `scripts/build.mjs` emits the Firefox 115 IIFE and independently probes native core, OMP production providers, and the all-OMP negative control.
- `test/probe.test.mjs` executes the IIFE in a browser-like VM without Node/Bun globals.
- `test/zotero-probe.test.ts` is the temporary real-Zotero loader; it is intentionally absent from the permanent suite.

## Reproduce the isolated build

Dependencies are installed only in a temporary directory. Lifecycle scripts are disabled, so OMP's Bun/native install paths do not run and the repository manifest and lockfile remain untouched.

```sh
OMP_DEPS_DIR="$(mktemp -d /tmp/native-core-omp-ai.XXXXXX)"
OMP_OUTPUT_DIR="$(mktemp -d /tmp/native-core-omp-output.XXXXXX)"

npm install --prefix "$OMP_DEPS_DIR" \
  --ignore-scripts --no-audit --no-fund --save-exact \
  @earendil-works/pi-agent-core@0.84.4 \
  @earendil-works/pi-ai@0.84.4 \
  @oh-my-pi/pi-ai@18.0.11 \
  @oh-my-pi/pi-catalog@18.0.11 \
  @oh-my-pi/pi-agent-core@18.0.11 \
  yaml@2.9.0 esbuild@0.25.12

OMP_PROTOTYPE_DEPS="$OMP_DEPS_DIR" \
OMP_PROTOTYPE_OUTPUT="$OMP_OUTPUT_DIR" \
npm --prefix artifact/pi-agent-runtime/omp-zotero-compatibility run build

OMP_PROTOTYPE_OUTPUT="$OMP_OUTPUT_DIR" \
npm --prefix artifact/pi-agent-runtime/omp-zotero-compatibility test
```

`@oh-my-pi/pi-agent-core` is installed only for the negative-control import probe. It is not part of the hybrid IIFE.

`build-summary.json` and `omp.iife.js` are written to `OMP_OUTPUT_DIR`. A successful build command still reports `"verdict": "no-go"`: this means the probes completed, while the production OMP provider failed the runtime boundary.

## Reproduce in Zotero

Temporarily import `artifact/pi-agent-runtime/omp-zotero-compatibility/test/zotero-probe.test.ts` from a scratch Zotero test suite, then run the existing harness:

```sh
OMP_PROTOTYPE_OUTPUT="$OMP_OUTPUT_DIR" \
ZOTERO_TEST_GREP='runtime platform services in Zotero native-core OMP-ai compatibility bundle' \
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/path/to/zotero \
xvfb-run -a node_modules/.bin/tsx scripts/run-zotero-test-with-mock.ts \
  test:zotero:cli lite core --exit-on-finish
```

Remove the scratch import after each run. The prototype does not permanently alter the Zotero test suite.
