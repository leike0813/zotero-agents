# Design

## Context

See proposal.md. C01 owns a text-only model-stream seam and a single terminal; C03 owns immutable selection and encrypted credentials. Backend Manager is a Preact page under `src/dashboard/`, with host actions in `src/modules/workflow/settings/backendManager.ts`.

## Goals / Non-Goals

**Goals:** Keep Provider execution in one concrete module, preserve redacted failure identity, and reuse existing credential and page contracts.

**Non-Goals:** OAuth, production Conversation/Skill Run ownership, prompt assembly, Provider discovery, new packages, or a generic execution framework.

## Decisions

- `createPiApiKeyModelSource(selection, admission)` returns the existing C01 model-source shape. It converts already-prepared text context to native Pi context, builds a transient native model from the frozen selection, and reads the selected credential per invocation. No secret is retained by the returned source between calls.
- A small API-dialect dispatch selects the four native browser-compatible stream adapters. Admission uses the snapshot's catalog-resolved API rather than a handwritten Provider-name list. Explicit `apiKey` or a non-secret keyless sentinel prevents ambient-key fallback; local endpoints require a caller-supplied authorization preflight and fail closed when absent.
- C01 recognizes only a typed project failure from the model source; raw exceptions remain `model_failed`. The Provider module classifies HTTP 401/403, 429, 5xx, other status, network, malformed stream, and abort before crossing the seam. It never forwards headers, bodies, or exception chains.
- The Backend Manager credential form uses a transient password input and dedicated typed actions. The host stores plaintext directly through C03 and returns metadata only. A request-correlated connection test runs one short prepared turn only after a click; results are ephemeral and redacted. The host catches credential/test errors before its generic `String(error)` response path.
- The esbuild guard is installed only on the plugin runtime bundle and matches the resolved `provider-env.js` importer plus `node:fs` specifier. Its replacement throws if executed. Browser platform resolution continues to reject all other host imports.

## Risks / Trade-offs

- Some catalog API strings have no admitted browser adapter → explicit `unsupported_provider` before network.
- Native Provider clients may retain request state until abort settles → test signal propagation and suppress late C01 publication.
- An abrupt host exit can leave the C09 daemon; C04 does not change that process lifecycle.
