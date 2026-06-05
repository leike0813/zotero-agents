## Overview

`skillrunner.job.v1` remains the workflow-facing request kind. The provider chooses between two execution sources:

- `local-package` (default): resolve the plugin-side skill by `skill_id`, zip it, create a temp-upload backend run, then upload the skill package and optional input files.
- `installed`: preserve the current behavior and submit `skill_id` to `/v1/jobs`.

The implementation follows the current `reference/Skill-Runner` source, where temporary upload runs are represented by `/v1/jobs` plus `skill_source: "temp_upload"`, not by the documented `/v1/temp-skill-runs` route.

## Request Model

`SkillRunnerJobRequestV1` gains `skill_source?: "local-package" | "installed"`.

Declarative workflow compilation reads `request.create.skill_source`; missing or invalid values normalize to `"local-package"`. `request.create.skill_id` remains required because both routes need it: local-package uses it for plugin skill lookup, installed uses it for backend skill lookup.

## Local Skill Package Bundling

The bundler uses `scanPluginSkillRegistry()` so user skills override built-in skills consistently with the rest of the plugin. It builds a deterministic zip:

- top-level directory: `<skill_id>/`
- entries sorted by normalized relative path
- entry names use `/`
- excluded noise: `.git`, `node_modules`, `.venv`, `__pycache__`, `.pytest_cache`, `.DS_Store`, `Thumbs.db`, and similar cache/system files

If the skill is not found, provider execution fails before backend create with a message explaining that the workflow can opt into `installed` source if backend-installed execution is intended.

## Transport

Existing upload zip and multipart helpers are generalized so a single multipart request can contain multiple zip parts:

- `skill_package`: required for local-package runs, filename `skill_package.zip`
- `file`: optional input zip, filename `inputs.zip`

Create body for local-package runs includes engine/provider/model/effort/input/parameter/runtime options and `skill_source: "temp_upload"`, but omits `skill_id`. Polling and result fetching continue to use `/v1/jobs/{request_id}` paths because the current backend source exposes temp-upload runs through the jobs router.

## Compatibility

Installed route remains available through `request.create.skill_source: "installed"`. Existing upload-relative file input semantics stay unchanged for both routes: `input.<key>` stores the upload-relative path and `upload_files[].path` stores the local absolute file path.

ACP adaptation is not changed in this change. The adapter still consumes `skillrunner.job.v1` as the workflow-facing contract and converts it separately for ACP backends.

## Risks

- Backend documentation and backend source currently disagree on temp-skill endpoint names. This change explicitly targets current source behavior and documents that choice.
- Deterministic zipping must avoid Node-only APIs in plugin runtime paths. The bundler uses runtime persistence file APIs and the provider's existing byte-level zip writer pattern.
