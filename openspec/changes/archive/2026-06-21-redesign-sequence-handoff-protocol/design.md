# Design

Sequence handoff is a list of explicit bindings. Each binding writes either a logical value or a logical file reference from a previous step result into the next step request.

The runtime resolves bindings before provider dispatch. `value` bindings are copied directly. `file` bindings must target top-level `/input/<key>` so the SkillRunner adapter can generate `upload_files[].key` without inventing nested upload semantics.

Provider adapters own materialization:

- ACP materialization writes native absolute local paths and never emits `upload_files`.
- SkillRunner materialization has two file sources:
  - local frontend files write upload-relative input paths and emit `upload_files`;
  - reused-workspace artifacts write upload-relative input paths and attach
    `runtime_options.workspace.file_bindings` so the backend copies or links the
    file inside the shared workspace before execution.

SkillRunner file handoff from a previous sequence step must not make the
frontend read or upload backend-local paths. If a previous step exposes an
absolute backend workspace path, the frontend may strip the reported
`workspaceDir` prefix into a workspace-relative `source_path`; otherwise the
source path must already be workspace-relative.

There is no default pass-through. A step only receives handoff data that is explicitly declared in `bindings`.
