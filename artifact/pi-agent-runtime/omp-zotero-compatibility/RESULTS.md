# Native Pi core × OMP pi-ai compatibility result

## Recommendation

**No-go for embedding the published OMP `pi-ai@18.0.11` as this project's production provider layer.**

The corrected architecture itself is sound: upstream native `@earendil-works/pi-agent-core@0.84.4` can consume a project-owned `StreamFn` that translates to and from OMP `pi-ai`. That exact mixed runtime completed a two-turn tool loop in Zotero 7 and Zotero 9. No OMP Agent core was present.

The remaining blocker sits below that seam. OMP's production dispatcher and OpenAI Responses provider both pull host-only code into the Firefox bundle. The mock-backed hybrid result proves the ABI bridge and native Agent control flow; it cannot stand in for a production provider request. Consequently, #35 remains no-go for the pinned packages, but the prior “OMP Agent core is incompatible” rationale does not apply to the intended design.

## Frozen inputs

| Role | Package | Version | npm integrity |
| --- | --- | ---: | --- |
| Runtime Agent core | `@earendil-works/pi-agent-core` | `0.84.4` | `sha512-HyUnjaOXj6oN/6SNcr8A1J/ElRQA50FtIE0XUTSKAQVqmdlb9qdojOyUQwF/jULE5+yOEtGuVgi/N1RnBiNG+g==` |
| Native core ABI/runtime dependency | `@earendil-works/pi-ai` | `0.84.4` | `sha512-AClAZxf5+c4RRu44NJPS6wyQy+Nmq+Mzyyrdvm4ZVMNuixelO02RZX4G4Aq1F145Yzp43wnM5S+hLlSI7ypfVw==` |
| Candidate provider layer | `@oh-my-pi/pi-ai` | `18.0.11` | `sha512-hgPcRLTta+W+Erlb5NRFJ7hXo/Wp9w6d9K1bfbfuUZ7tD0ksV397c8VFohsPJWq5Kwx1+kwQva7s1hWPPO6Sxg==` |
| Candidate catalog | `@oh-my-pi/pi-catalog` | `18.0.11` | `sha512-TQdHq2VE+ftOfPJzTcOL5MeDAlc95GkjKlT3HL5G91LqRKIosXptCgq59+g3g8hsxo7x+WuoOmd2KHBy4Q16vw==` |
| Negative control only | `@oh-my-pi/pi-agent-core` | `18.0.11` | `sha512-lni89wtJ3WOpXPcTNtxcYsVgdzJByVnELwCcAl6MOcJJLgt/h0wGcwV5fEOsMKF3oboZrujbCcAdHSvJClrvsQ==` |

The isolated install also pins `yaml@2.9.0` and `esbuild@0.25.12`. Lifecycle scripts were disabled. OMP Agent core is not a candidate component; it remains in the experiment solely to show how the rejected all-OMP graph differs from the intended mixed graph.

## What the adapter proved

The prototype adds one source module, `ompPiAiStreamAdapter.ts`, at the native core's public `StreamFn` seam. It performs only the unavoidable ABI translations:

- native `Context.systemPrompt: string` becomes OMP `string[]`;
- user, assistant, tool-call, and tool-result messages cross the versioned Pi ABI;
- OMP streamed events and final messages become native `AssistantMessageEventStream` events;
- OMP `reasoningTokens` maps to native usage `reasoning`;
- API key, abort signal, fetch, session, cache, metadata, and response hooks are forwarded through an explicit allowlist;
- OMP-only assistant blocks with no native representation fail closed instead of silently entering native core state.

The native Agent retained ownership of context projection order. On each of the two requests it ran `transformContext` before `convertToLlm`. It then consumed OMP events, executed the native `echo` tool, appended the native tool-result message, called OMP `pi-ai` again, and finished with `stopReason: "stop"` and `echo complete`.

The emitted IIFE's metafile confirms:

| Runtime package | Present in hybrid bundle |
| --- | --- |
| Native `pi-agent-core` | yes |
| OMP `pi-ai` | yes |
| OMP `pi-agent-core` | no |

## Strict bundle results

Each surface was independently bundled with `platform: "browser"`, `target: "firefox115"`, and a boundary plugin that rejects every reachable Node builtin, `node:`, or `bun:` import. No empty host-module aliases were permitted.

| Surface | Result | Build errors | Meaning |
| --- | --- | ---: | --- |
| Native `pi-agent-core` | direct | 0 | The intended Agent core passes the Zotero boundary. |
| OMP `pi-catalog/models` | direct | 0 | Static catalog data/API is browser-safe. |
| Native core + adapter + OMP mock | adapter-required | 55 before evidence adapter | The semantic bridge works; OMP mock's general error barrel is host-polluted. |
| Native core + adapter + OMP `streamSimple` | unavailable | 134 | Production dispatcher reaches Node/Bun/native graph; 15 text-import errors. |
| Native core + adapter + OMP OpenAI Responses | unavailable | 128 | Provider leaf reaches Node/Bun/native graph; 15 text-import errors. |
| OMP Agent core negative control | unavailable | 139 | Confirms the older all-OMP path is a separate, irrelevant failure mode. |

The production graphs reach `bun`, `bun:ffi`, `bun:sqlite`, Node crypto/filesystem/network/process modules, `@oh-my-pi/pi-natives`, and unsupported text import attributes. Notably, the provider-specific OpenAI Responses module imports shared helpers from OMP's general stream layer, so choosing the provider leaf does not isolate it from host runtime services.

Making those production entry points browser-safe would require an upstream browser export or a maintained project fork. The approved `StreamFn` adapter can translate protocol values; it cannot erase reachable host dependencies inside the provider implementation.

## Evidence bundle and host matrix

The evidence IIFE uses two compatibility helpers beyond the main ABI bridge:

- a `Promise.withResolvers` polyfill required by Firefox 115;
- a minimal OMP mock error-barrel adapter, used only because the mock provider imports the host-oriented general error barrel.

This bundle has no reachable Node/Bun imports. It verifies the real native Agent loop, not just an isolated OMP stream:

- two OMP model calls;
- one native-core tool validation and execution cycle;
- tool result propagation into the second provider context;
- structured abort propagation;
- explicit project-supplied API-key forwarding, without OMP credential state;
- 66 bundled providers and 4,657 bundled models;
- a project-owned `models.yml` sanitizer accepting one declarative entry and rejecting embedded credentials/headers.

The same `12,389,239`-byte unminified IIFE (`402,386` bytes gzip) ran in both real hosts:

| Host | Gecko | Result |
| --- | ---: | --- |
| Zotero `7.0.32` | `115` | passed, 1 test |
| Zotero `9.0.4` | `140.10.0` | passed, 1 test |

Both processes exited cleanly, reported absent Node/Bun globals, and completed the two-turn native Agent tool loop. The bundle size is diagnostic; almost all raw bytes are catalog data.

## Decision boundary

| Question | Result |
| --- | --- |
| Can native Pi core accept OMP `pi-ai` through a narrow project adapter? | **Yes.** |
| Does that mixed runtime work in Zotero 7 and 9? | **Yes, with the evidence-only mock leaf.** |
| Can OMP `pi-ai@18.0.11` supply a production provider without host imports? | **No.** |
| Should OMP Agent core replace native Pi core? | Out of scope; it is not part of the architecture. |

The reusable pieces are native Pi core, the `StreamFn` seam, the event/message mapping design, and OMP catalog data. Admission can be revisited if OMP publishes a browser-safe provider boundary or if the project explicitly approves ownership of a provider fork. Until then, downstream implementation work must not treat the mock-backed hybrid success as production-provider approval.
