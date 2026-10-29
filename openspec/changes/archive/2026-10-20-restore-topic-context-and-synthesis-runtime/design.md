# Design

## Context

See proposal.md. Behavioral reference is `57dc41f81^`; native migration narrowed public context requests to required topicId/view and artifact-only detail. Public Bridge list/resolver requests reach strict native DTO rebuilders without their defaults. Existing buildRequest already runs after queue admission and can read host topics.

## Goals / Non-Goals

Restore the declared public API at its existing boundaries, preserving strict native schemas, internal artifact inventory and host-owned file delivery. No hook slot, submission state, dependency, transcript format or release workflow is added.

## Decisions

- Restore typed planned/materialized context variants in shared schemas and Rust projection. Keep aliases, intent echoes, include projection and file/export options at the host adapter; pure native reads remain filesystem independent.
- Public mixed inventory uses a shared bounded projection with materialized same-ID priority. Internal artifact lists retain their existing meaning.
- Normalize public list and resolver defaults before strict DTO validation. Resolver pages are consumed completely by the runtime.
- Existing create buildRequest builds the declared sequence with exclusive parameters, target name and input.planned_topic. Snapshot time is request construction after queue admission, rather than form confirmation. Explicit planned runtime accepts this snapshot and proceeds to material preparation; seed mode keeps semantic inventory selection.
- Update preparation combines semantic, digest and audit data and preserves discovery evidence. Graph metrics remain optional.
- Audit writes serialize and refresh the latest canonical apply state after apply/detach. Existing marker-free final transcript projection remains authoritative.

## Files and verification seams

- `packages/synthesis-contracts/src/topics.ts`, protocol JSON schemas, Rust topic application/DTO/wire route: context variants and production-route tests.
- `src/modules/synthesisClient/*`, `src/modules/hostBridgeCapabilityRegistry.ts`: public normalization, inventory and existing host export delivery; existing Bridge/context/output tests.
- `workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json`, workflow-local hook module and generated input schemas: snapshot producer; mandatory builtin request contract test.
- `skills_src/topic-synthesis/{runtime,renderer,contracts,templates}` and generated builtin skills: snapshot consumer, update fidelity, pagination and terminal guidance; existing split-runtime tests.
- ACP actions/audit and existing compatible runner tests: terminal audit ordering.
- Current docs and this change track semantics and evidence.

## Risks / Trade-offs

- Strict protocol projections can omit planned/discovery fields → test real native routes as well as mocks.
- Public mixed inventory can alter internal counts → leave native artifact inventory unchanged.
- Existing plans can change while queued → explicitly accepted request-time snapshot contract; apply still checks collisions.
- Generated content is governed → baseline `b6c49c7ba4a95d830cc768d63a6c209196e62b3f`, authorized deletion inventory empty; preserve all Host Bridge instruction units and record thickness/parity review before rendering.
