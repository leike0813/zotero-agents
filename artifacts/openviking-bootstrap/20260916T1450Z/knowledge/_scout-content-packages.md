# 内容包约定侦察报告（workflows_builtin / skills_builtin / skills_src）

- 范围：`workflows_builtin/`（163 文件）、`skills_builtin/`（273 文件）、`skills_src/`（87 文件），以及 `scripts/` 下生成与发布脚本。
- 方式：只读侦察（read/rg/grep/ls/find）。**事实**附证据 `路径:行号`；推断处显式标注「推测」。
- 基线：当前工作区（含未跟踪的 `__pycache__`）。

---

## 1. workflows_builtin 顶层包与完整目录树

顶层 = 1 个清单 + 4 个包目录：

| 顶层条目 | 文件数 | workflow.json | 用途（事实+归纳） |
|---|---|---|---|
| `manifest.json` | 1 | — | 内置工作流发货白名单：`version` + `files[]`，插件据此把内置包同步到运行时目录（`src/modules/workflow/catalog/builtinWorkflowSync.ts:20-26,459-483`） |
| `literature-workbench-package/` | 103 | 18 | 文献工作台：分析、深度阅读、翻译、解释、标签治理、导入导出、收集器 |
| `mineru/` | 7 | 1 | MinerU 文档转换（PDF/Office/网页 → Markdown/HTML/LaTeX/DOCX）单工作流包 |
| `synthesis-layer/` | 22 | 4 | Synthesis 层：主题规划、创建/更新主题综述、稿件文献框架 |
| `workflow-debug-probe/` | 30 | 19 | 调试探针：apply 契约、Host Bridge 连通性、sequence 编排诊断（全部 `debug_only`） |

一致性：103+22+7+30+1 = 163，等于 `find workflows_builtin -type f | wc -l`；`manifest.json` 声明 162 条 files（`workflows_builtin/manifest.json:2-3`），即除自身外全部文件，无遗漏项。校验器 `scripts/content-package/check-builtin-workflow-manifest.ts:76-102` 做双向集合比对（`UNSHIPPED_BUILTIN_PATH_PREFIXES` 目前为空数组，`:9`）。

`debug_only: true` 的 workflow 共 22/42：workflow-debug-probe 全部 19 个 + `add-digest-representative-image`、`debug-digest-apply-fixture`、`debug-note-artifact-inspector`（`grep -l` 统计）。

### 1.1 literature-workbench-package/（103 files）

```
workflow-package.json
add-digest-representative-image/workflow.json
add-digest-representative-image/hooks/applyResult.mjs
add-digest-representative-image/hooks/buildRequest.mjs
collection-collector/workflow.json  + README.md
collection-collector/hooks/applyResult.mjs
debug-digest-apply-fixture/workflow.json
debug-digest-apply-fixture/hooks/applyResult.mjs
debug-note-artifact-inspector/workflow.json
debug-note-artifact-inspector/hooks/applyResult.mjs
export-literature-bundle/workflow.json  + README.md
export-literature-bundle/hooks/applyResult.mjs
export-notes/workflow.json  + README.md
export-notes/hooks/applyResult.mjs
export-notes/hooks/buildRequest.mjs
export-research-bundle/workflow.json  + README.md
export-research-bundle/hooks/applyResult.mjs
import-literature-bundle/workflow.json  + README.md
import-literature-bundle/hooks/applyResult.mjs
import-notes/workflow.json  + README.md
import-notes/hooks/applyResult.mjs
literature-analysis/workflow.json  + README.md
literature-analysis/hooks/applyResult.mjs
literature-analysis/hooks/buildRequest.mjs
literature-analysis/assets/zt-field.eta
literature-analysis/assets/zt-note.eta
literature-deep-reading/workflow.json  + README.md
literature-deep-reading/hooks/applyResult.mjs
literature-deep-reading/hooks/buildRequest.mjs
literature-explainer/workflow.json  + README.md
literature-explainer/hooks/applyResult.mjs
literature-metadata-curator/workflow.json  + README.md
literature-metadata-curator/hooks/applyResult.mjs
literature-metadata-curator/hooks/buildRequest.mjs
literature-metadata-curator/hooks/preflight.mjs
literature-search-ingest/workflow.json  + README.md
literature-search-ingest/hooks/applyResult.mjs
literature-translator/workflow.json  + README.md
literature-translator/hooks/applyResult.mjs
literature-translator/hooks/buildRequest.mjs
tag-auditor/workflow.json  + README.md
tag-auditor/hooks/applyResult.mjs
tag-bootstrapper/workflow.json  + README.md
tag-bootstrapper/hooks/applyResult.mjs
tag-bootstrapper/hooks/buildRequest.mjs
tag-regulator/workflow.json  + README.md
tag-regulator/hooks/applyResult.mjs
tag-regulator/hooks/buildRequest.mjs
lib/  (30 files: bindings, bundleBibliography, canonicalLiteratureValidators, clipboard,
      deepReadingResultTarget, digestPayload, embeddedPayloadAttachments, htmlCodec,
      importSchemas, literatureBundle, literatureDeepReadingBundle, literatureDigestNotes,
      literatureDigestSidecar, markdownLocalImages, metadataCurator, model,
      noteEmbeddedImages, path, referenceQualityGate, remote, representativeImage,
      researchBundle, researchBundleReadme, resultOutput, runtime, state,
      statusTransition, tagCompliance, tagRegulatorRequest, translatorArtifacts)
locales/  (10 files: de, es-ES, fr-FR, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, zh-CN, zh-TW .json)
```

- README 覆盖：18 个 workflow 目录中 15 个有 README，缺 `add-digest-representative-image`、`debug-digest-apply-fixture`、`debug-note-artifact-inspector`（`ls` 校验）。这三个恰是 literature-workbench-package 内 `debug_only: true` 的 workflow（其余 15 个为非 debug）→ **推测**：README 要求只对正式发布内容生效。
- hook 数：27；包级 `lib/` 与 `locales/` 无 README。

### 1.2 mineru/（7 files）

```
workflow-package.json
workflow.json
README.md
hooks/preflight.mjs
hooks/buildRequest.mjs
hooks/applyResult.mjs
lib/pdfSplitPlan.mjs
```

### 1.3 synthesis-layer/（22 files）

```
workflow-package.json
topic-planner/workflow.json  + README.md
create-topic-synthesis/workflow.json  + README.md
update-topic-synthesis/workflow.json  + README.md
manuscript-literature-framing/workflow.json  + README.md
hooks/applyTopicSynthesisResult.mjs
hooks/applyTopicPlanResult.mjs
hooks/applyManuscriptLiteratureFramingResult.mjs
locales/  (10 files: de, es-ES, fr-FR, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, zh-CN, zh-TW .json)
```

注意：hooks 放在**包根** `hooks/`，workflow.json 用 `../hooks/...` 引用（`workflows_builtin/synthesis-layer/topic-planner/workflow.json:58-60`）。

### 1.4 workflow-debug-probe/（30 files，全部 `debug_only: true`）

```
workflow-package.json
workflow.json                                  ← 包入口（provider: pass-through）
README.md
hooks/applyResult.mjs
hooks/applyHostBridgeConnectivityProbeResult.mjs
hooks/applySequenceProbeResult.mjs
hooks/applyDebugApplyContractResult.mjs
hooks/applyExistingParentDebugBundleResult.mjs
hooks/applyHostQueueProbeResult.mjs
hooks/applyInteractiveChoiceProbeResult.mjs
hooks/buildDebugApplyContractRequest.mjs
hooks/buildExistingParentDebugApplyRequest.mjs
debug-host-bridge-connectivity-probe/workflow.json
debug-host-bridge-connectivity-sequence-probe/workflow.json
debug-host-queue-probe/workflow.json
debug-interactive-choice-probe/workflow.json
debug-interactive-then-result/workflow.json
debug-apply-existing-parent-bundle/workflow.json
debug-apply-manifest-bundle/workflow.json
debug-apply-single-bundle/workflow.json
debug-apply-single-result/workflow.json
debug-apply-sequence-bundle/workflow.json
debug-apply-sequence-result/workflow.json
debug-apply-bundle-then-result/workflow.json
debug-apply-result-then-bundle/workflow.json
debug-sequence-linear-probe/workflow.json
debug-sequence-workspace-reuse-probe/workflow.json
debug-sequence-file-handoff-probe/workflow.json
debug-sequence-context-isolation-probe/workflow.json
debug-sequence-countdown-probe/workflow.json
```

---

## 2. 代表性包：literature-workbench-package 清单格式

包内共三层清单，语义不同：

### 2.1 `workflows_builtin/manifest.json`（内置发货清单）

- 结构：`{ "version": 1, "files": [<相对路径>...] }`（`workflows_builtin/manifest.json:1-4`）。
- `version`：**必填，正整数**，用于同步去重/失效；解析时非有限正数即报错（`src/modules/workflow/catalog/builtinWorkflowSync.ts:464-475`）。
- `files`：**必填，非空字符串数组**，逐文件白名单（非 glob）；空数组报错（`builtinWorkflowSync.ts:476-478`）。
- **没有 JSON Schema**：仅手写校验（`scripts/content-package/check-builtin-workflow-manifest.ts:53-68` + `builtinWorkflowSync.ts:459-483`）。文件内**不存在**版本兼容性字段。

### 2.2 `literature-workbench-package/workflow-package.json`（包清单）

Schema：`src/schemas/workflow-package.schema.json`（draft 2020-12，`$id: workflow-package.schema.json`，title `WorkflowPackageManifest`）。实例：`workflows_builtin/literature-workbench-package/workflow-package.json:1-39`。

| 字段 | 必填 | 类型/约束 | 含义 |
|---|---|---|---|
| `id` | ✅ | string, minLength 1 | 包标识；同时是 zip 内 `workflows/<id>/` 的目录名与产物文件名前缀 |
| `version` | ✅ | string, minLength 1 | 包版本（内容约定为 semver；schema 不校验格式） |
| `workflows` | ✅ | array≥1 of string | 包内 workflow.json 的**相对路径**列表，逐条声明 |
| `i18n` | ❌ | object, `additionalProperties: false` | 国际化入口 |
| `i18n.defaultLocale` | ❌ | string | 默认语言，实测 `en-US` |
| `i18n.locales` | ❌ | object<string,string> | locale 代码 → locales/*.json 相对路径 |

顶层 `additionalProperties: false`（`src/schemas/workflow-package.schema.json:42`）→ **多一个字段即校验失败**。包清单**无**兼容性/最低版本字段；兼容门禁统一在 `content-package.version.json.requires`（见 §5）。校验器：`src/workflows/loaderContracts.ts:83-95`（Ajv strict + `$data`）。

### 2.3 `<workflow-dir>/workflow.json`（工作流清单，schemaVersion 2）

Schema：`src/schemas/workflow.schema.json`（1138 行，title `WorkflowManifest`）。实例：`workflows_builtin/literature-workbench-package/literature-analysis/workflow.json:1-174`。

- **必填**（`workflow.schema.json:6-15`）：`schemaVersion`（`const: 2`）、`id`、`label`、`provider`、`trigger`、`inputs`、`validateSelection`、`hooks`。
- **可选**：`description`、`executionModes`（enum `auto|interactive`）、`supportedInvocationModes`（`interactive|non-interactive`）、`resourceRequirements`、`version`、`display`（`core`/`emoji`）、`taskNameTemplate`、`i18n`、`parameters`、`execution`、`result`、`request`。
- **hooks 规范**（`workflow.schema.json:406-422`）：对象，必填 `applyResult`；可选 `preflight`、`buildRequest`、`normalizeSettings`；`additionalProperties: false`；值均为相对 `workflow.json` 所在目录的路径。
- **版本与兼容性**：`workflow.json` 自身只有可选 `version`（string），**无** minPluginVersion/compat 字段。根 `additionalProperties: true`（`:206`），故 `debug_only`（`types.ts:2690`）等扩展字段通过校验；`backend`、`defaults` 显式置 `false` schema（`:96-97`），命中即报 “uses deprecated field”（`src/workflows/loaderContracts.ts:109-111`）。
- **request.kind 条件约束**（`workflow.schema.json:100-204`）：`skillrunner.job.v1` 无 buildRequest hook 时强制要求 `request.create`；`skillrunner.sequence.v1` 强制 `provider ∈ {acp, skillrunner}` 且必须提供 `request.sequence` 或 `hooks.buildRequest`。
- 实测 provider 取值（42 个 workflow.json）：`skillrunner` ×32、`pass-through` ×9（`workflow-debug-probe/workflow.json:8`）、`generic-http` ×1（`mineru/workflow.json`）；`workflows_builtin` 内**没有** `acp`（`provider` 字段本身在 schema 中只是非空字符串）。

---

## 3. 包的目录约定

- **hooks/ 位置不固定，两种都合法**：workflow 目录内（literature-workbench-package，18/18 如此）或包根 `hooks/`（synthesis-layer、workflow-debug-probe）。解析基准恒为 workflow.json 所在目录：`joinPath(workflowRoot, manifest.hooks.applyResult)`（`src/workflows/loader.ts:780`，preflight 见 `:824`）。
- **hook 文件形态：只有 `.mjs`（ESM JavaScript）**。42 个 hook 文件全部 `.mjs`，无 `.ts`/`.js`/`.json`（`find -path '*/hooks/*' | sed 's/.*\.//' | sort | uniq -c` → `42 mjs`）。
- **steps/sequences 没有独立目录**：sequence 步骤**内联**在 `workflow.json` 的 `request.sequence.steps[]`。例：`literature-analysis/workflow.json:78-122`（digest/tag-regulator 两步，含 `handoff.bindings`、`include_if`）；`workflow-debug-probe/debug-sequence-linear-probe/workflow.json:35-82`（emit/check/finalize 三步）。`workflows_builtin` 下不存在 `steps/` 或 `sequences/` 目录。单步 workflow 用 `request.kind: skillrunner.job.v1`（`debug-apply-single-bundle/workflow.json:27-32`）。
- **assets/**：workflow 级资源，目前仅 `literature-analysis/assets/{zt-field.eta,zt-note.eta}`（Eta 模板）。skill 级 `assets/` 则是必备项（见 §4）。
- **locales/**：包级扁平 key-value JSON，key 形如 `workflows.<workflowId>.label`、`.parameters.<name>.title|description`、`.skills.<skillId>.name`、`.taskNameTemplate`（`literature-workbench-package/locales/zh-CN.json:2-18`）。只有 literature-workbench-package 与 synthesis-layer 提供。
- **README.md**：挂在 workflow 目录（15/18），workflow-debug-probe 则只有包级 README。
- **lib/**：包内共享 ESM 模块，被 hook 以相对路径 import（literature-workbench-package 30 个、mineru 1 个）。
- **打包形态：ZIP（bundle），不是目录分发**。`build-content-package-feed.ts:446-477` 组装 `content-package.json` + `workflows/<pkg>/...` + `skills/<skill>/...` 并 `createZipFromNamedFiles`，产物 `<out>/<channel>/packages/<id>-<version>-<channel>.zip` 并写 `.sha256`（`:474-483`）。包内文件按 git tracked 过滤（`:254-274`），因此未跟踪文件默认不会入包。

---

## 4. skills_src ↔ skills_builtin 关系

### 4.1 谁生成谁：分两组，不是单一关系

| skills_src 子目录 | 产物 | 生成器 |
|---|---|---|
| `topic-synthesis/` | `skills_builtin/{create-topic-synthesis-prepare, update-topic-synthesis-prepare, topic-synthesis-core-enrichment, topic-synthesis-finalize}/` | `skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts` |
| `literature-deep-reading/` | `skills_builtin/literature-deep-reading/` | `skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts` |
| `zotero-bridge-cli/`、`zotero-library-agent/` | **不是** skills_builtin，而是 `addon/content/host-bridge-skills/**` | `npm run render:host-bridge-content` → `scripts/host-bridge/render-host-bridge-surfaces.ts`，映射见 `contracts/host-bridge/surfaces.json:9-11,25-27` |

- 生成器入口（事实）：
  - `skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:877-889` `export async function renderTopicSynthesisSkills(outRoot = path.join(REPO_ROOT, "skills_builtin"))`；输出目录由 `--out` 覆盖（`:891-899`）；CLI 守卫 `:901-916`。
  - `skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:149-167` `export async function renderLiteratureDeepReadingSkill(options?: { outRoot?: string })`，默认 `skills_builtin`（`:157`），并 `npx tsx scripts/content-package/build-literature-deep-reading-graph-renderer.ts`（`:150-156`）；CLI 守卫 `:168-170`。
- **无 npm script 封装**：在 `package.json`、`scripts/`、`src/` 中检索两个 renderer 文件名均无命中；调用方式为手工 `npx tsx <renderer 路径>`。**推测**：这是有意保留的人工再生成步骤（未在 CI/release gate 中固化）。
- 其余 20 个 `skills_builtin/<skill>/`（literature-analysis、tag-regulator、mineru 相关等）在本仓库内**没有生成器**，是直接维护的，或来自 submodule：`skills_builtin/literature-{explainer,analysis,translator}` 是 `.gitmodules:1-11` 声明的 `leike0813/agent-skills` 子模块（`literature-analysis/.git` 为 gitdir 指针文件）。

### 4.2 skills_src 下各目录含义

- `contracts/`：**机器可读的单一事实源**，供 renderer 生成 SKILL.md 与 schema 资产。
  - topic-synthesis：`stages.yaml`（skill 定义 + stage 列表，`contract_version: "0.1.0"`，`skills_src/topic-synthesis/contracts/stages.yaml:1-30`）、`paths.yaml`（runtime/handoff/result/schema 路径约定，`:1-13`）、`stage-guidance.yaml`、`handoff.schema.json`、`payload-schemas/stage-*.schema.json`、`stdout-envelope.schema.json`、`db-schema.sql`。
  - literature-deep-reading：`stages.json`（stage_id + runtime_command + payload_path + schema，`skills_src/literature-deep-reading/contracts/stages.json:1-35`）。
- `runtime/`：skill 内嵌的 Python 运行时。topic-synthesis 为 `runtime/topic_synthesis_runtime/**`（common/gate.py、common/topic_synthesis_db.py，其余为 `.gitkeep` 占位）；literature-deep-reading 为单文件 `runtime/deep_reading_runtime.py`。
- `templates/`：Jinja2 模板。topic-synthesis 有 4 个 `<skill-id>/SKILL.md.j2` + `fragments/*.md.j2`（execution-contract、failure-rules、frontmatter、llm-runtime-boundary、output-contract、product-goals、runtime-state、scope、stage-loop、strict-stage-order、zotero-bridge-cli）；literature-deep-reading 为 `templates/SKILL.md`（直拷）。
- `renderer/templates/`：前端渲染资产（`deep-reading.html.tpl`、`*.js`、`*.css`、i18n json），原样拷贝进产物 `renderer/templates/`。
- `assets/`（skills_src 侧）：`input/output/parameter.schema.json`、`runner.json`、`schemas/*.schema.json` 源副本。

### 4.3 skills_builtin/<skill>/ 标准结构

注册表事实源：`src/modules/workflow/catalog/pluginSkillRegistry.ts:31`（`PLUGIN_SKILL_BUILTIN_ROOT = "skills_builtin"`）；合法性要求 `SKILL.md`（`:327-333`）+ `assets/runner.json`（`:343-346`），并逐个校验 input/parameter/output schema（`:398-407`），最后算目录校验和（`:409-420`）。

```
<skill>/
├── SKILL.md                      # 必备，YAML frontmatter: name / description（+metadata）
├── assets/
│   ├── runner.json               # 必备，skill 清单
│   ├── input.schema.json         # 按 runner.json.schemas 声明
│   ├── parameter.schema.json
│   ├── output.schema.json
│   ├── schemas/*.schema.json     # 可选，stage/handoff 子 schema
│   ├── templates/*.j2            # 可选，渲染模板
│   ├── claude_settings.json / codex_config.toml / gemini_settings.json / iflow_settings.json  # 可选，引擎配置
│   └── core_instruction.md / scoring_rubric.json   # 可选
├── references/*.md               # 可选，长文参考
├── scripts/*.py                  # 可选，Python 运行时
├── renderer/templates/**         # 可选，前端渲染资产
└── tests/                        # 可选
```

- 覆盖统计（`find -mindepth 2 -maxdepth 2 -type d`）：assets 26/26、scripts 14、references 7、tests 1、renderer 1。26 个 skill 目录全部同时具备 `SKILL.md` 与 `assets/runner.json`（脚本校验，无缺失）。
- `runner.json` schema：`src/schemas/skill/skill_runner_manifest.schema.json`；必填 `id` + `execution_modes`（enum `auto|interactive`，`:5,31-39`）；可选 `version`、`engines`/`unsupported_engines`、`max_attempt`、`schemas{input,parameter,output}`、`entrypoint{prompts, result_json_filename}`、`engine_configs`，以及通过 `additionalProperties` 允许的 `runtime{language,version,dependencies,...}`、`debug_only`。实例：`skills_builtin/tag-regulator/assets/runner.json:1-15`、`skills_builtin/literature-deep-reading/assets/runner.json:1-26`。
- 顶层附加文件：`skills_builtin/.gitkeep`、`skills_builtin/.public`（内容仅 `zotero-bridge-cli`，是 `scripts/content-package/publish-skills.ps1:46-58` 的发布白名单）。

---

## 5. 内容包版本与发布

### 5.1 版本事实源

`content-package.version.json`（仓库根）是唯一内容包版本源：

```json
{ "schema": "zotero-agents.content-version.v1", "id": "zotero-agents-official-workflows",
  "version": "0.8.7", "content_api": "3.0.0",
  "requires": { "plugin": ">=0.9.0", "content_api": "^3.0.0", "zotero": ">=7 <11" } }
```

（`content-package.version.json:1-11`）

- 读取：`build-content-package-feed.ts:26,191-234`；环境变量 `CONTENT_PACKAGE_VERSION` 优先于文件值（`:215-218`）；文件缺失时从 `package.json.version` + `CONTENT_API_VERSION` 兜底（`:192-204`）。
- 写入/递增：`npm run bump:content-package -- <patch|minor|major|x.y.z>`（`scripts/content-package/bump-content-package-version.ts:37-59,71-87`）；带 `--plugin-version` 时同步改写 `requires.plugin`（`:51-56`）。
- 兼容性判定在插件侧：`src/modules/workflow/catalog/contentPackageSubscription.ts:206` `CONTENT_API_VERSION = "3.0.0"`；`:724-740` 用 semver 校验 `requires.plugin`（对 `package.json.version`）与 `requires.content_api`（对 `CONTENT_API_VERSION`），失败码 `content_api_unsupported` 等（`:319,341-350,711-716` 还兼容旧的 `min_plugin_version`/`content_api` 条目字段）。

### 5.2 打包与发布链路

1. `npm run build:content-feed [-- --channels stable,dev]` → `build-content-package-feed.ts:520-530`。通道枚举 `stable|beta|dev`（`content-package-channels.ts:1`），默认 `["stable","dev"]`，仅 `dev` 含 debug 内容（`build-content-package-feed.ts:24-25`）。
2. 过滤：`debug_only: true` 的 workflow（`:310-314,352-355`）与 skill（读 `assets/runner.json` 的 `debug_only`，`:415-422`）在非 dev 通道被剔除；包清单 `workflows[]` 会被重写为剩余项（`:322-325`）。
3. 产物：`artifacts/content-packages/<channel>/packages/zotero-agents-official-workflows-<version>-<channel>.zip` + `.sha256`；feed 文件 `<channel>/feed.json`（schema `zotero-agents.content-feed.v1`，含 `packages[].artifact{path,url,mirrors,sha256,size}`，`:484-514`）。
4. 发布：`npm run release:content-package -- <bump|--dispatch> [--channels ...] [--watch]` → `prepare-content-package-release.ts`（dispatch 目标仓库 `leike0813/zotero-agents`、ref `main`、workflow `publish-content-feed.yml`，`:43-46`）。
5. CI：`.github/workflows/publish-content-feed.yml`，先 `git submodule update --init skills_builtin`（`:35-36`），产物发布为 release tag `official-workflows-v${VERSION}`（`:58-60`）到 `leike0813/zotero-agents-workflows`（`:28`；同见 `build-content-package-feed.ts:27,236-252` 的 release/mirror URL 构造）。
6. feed 另发布到 `content-feed` 分支（`publish-content-package-feeds.ts:15,22-38`）。
7. 门禁：`npm run check:content-package-release[:all]` → `check-content-package-release.ts`，校验各通道 feed 的 `packages[].version` 与 `content-package.version.json:322-399` 一致。

### 5.3 三层 version 字段的分工（事实）

- 内容包版本 = `content-package.version.json.version`（发布/兼容门禁唯一依据）。
- 包版本 = `workflow-package.json.version`（literature-workbench-package `1.0.0`、synthesis-layer `1.0.0`、mineru `0.1.0`、workflow-debug-probe `0.2.0`）。
- 工作流版本 = `workflow.json.version`（42 个 workflow.json 的分布：`0.1.0` ×31、`0.2.0` ×2、`0.3.0` ×2、`0.5.0` ×1、`1.0.0` ×6）。
- skill 版本 = `assets/runner.json.version`（如 tag-regulator `1.0.1`、literature-analysis `1.2.0`、literature-translator `2.0.0`）。
- 在 `src/`、`scripts/`、`package.json` 中未发现任何「按 skill/workflow 版本递增或校验」的脚本 → 后三者只作信息字段，不参与发布门禁。**推测**：其递增靠人工维护。

### 5.4 与内容包无关的相邻系统（避免混淆）

- `feeds/skillrunner-runtime/feed.json`：SkillRunner 运行时 feed（schema `zotero-agents.skillrunner-runtime-feed.v1`），内容是 plugin 版本区间 → skillrunner 版本映射（`:1-23`），**不是**内容包。
- `profiles_src|profiles/hermes/zotero-librarian` 与 `skills_src/zotero-*`：Hermes profile / Host Bridge 三层发布面，独立版本体系（`profiles/hermes/zotero-librarian/distribution.yaml:1-8`，version `0.5.5`），由 `contracts/host-bridge/surfaces.json:62-74` 映射，**不进**内容包 zip。

---

## 6. 疑点清单（待核查）

1. `skills_builtin/zotero-bridge-cli` 与 `skills_builtin/zotero-library-agent` 在磁盘上不存在，却被发布脚本引用：`scripts/host-bridge/publish-host-bridge-cli-bundle.ps1:109,117,123`、`scripts/host-bridge/publish-zotero-library-agent-bundle.ps1:14-15`。→ 是废弃路径、还是需先由某步物化？
2. `skills_builtin/.public` 只有 `zotero-bridge-cli` 一项，而 `publish-skills.ps1:9` 注释称“默认 4 个 skill”。→ 白名单与实际发布集不一致。
3. 多个 skill 的 `scripts/__pycache__/*.pyc` 存在于工作区（collection-collector、create-topic-synthesis-prepare、export-research-bundle、manuscript-literature-framing、topic-synthesis-core-enrichment 等）。当前被 gitignore（`git status --ignored` 显示 `!!`），且打包按 tracked 过滤，故**当前不会入包**；但 `build-content-package-feed.ts:178-182` 在 `git ls-files` 失败时回退为文件系统遍历 → 非 git 环境构建会带入 `.pyc`。
4. `skills_src/literature-deep-reading/runtime/__pycache__/*.pyc` 同样存在于源码目录（同第 3 条风险面）。
5. `manifest.json`、`workflow-package.json`、`workflow.json` 三层的 version 语义重叠但互不联动；`workflow.json.version` 实测 31/38 停留在 `0.1.0`。→ 是否需要一致性校验？
6. hook 引用路径跨目录（`../hooks/*.mjs`）只靠相对路径字符串，schema 不校验文件存在性；`loaderContracts.ts` 有 `hook_missing_error` 分类（`:13`），但未见 schema 层约束。→ 运行期 fail 时机需确认。
7. `topic-synthesis` renderer 会 `fs.rm(targetRoot, {recursive:true, force:true})` 后再写（topic-synthesis 为按 skill 覆盖；literature-deep-reading 见 `render_literature_deep_reading_skill.ts:159-160`）→ 手工放在生成目录里的文件会被静默删除。
8. 两个 renderer 均未接入 npm script / CI；`build-content-package-feed.ts` 也不会自动触发再生成 → 源码与 `skills_builtin` 可能漂移。**推测**：存在人工步骤或文档约定（本次未查文档与 openspec）。

---

## 7. 未覆盖范围

- `addon/content/host-bridge-skills/**` 的实际内容与渲染细节（仅核实了 `skills_src → addon` 的映射与 `render:host-bridge-content` 入口）。
- `profiles/`、`profiles_src/` 的完整结构与版本脚本（`host-bridge-surface-version.ts`）内部逻辑。
- `feeds/skillrunner-runtime` 的更新机制与 `scripts/` 下的 runtime feed 生成器。
- `src/workflows/loader.ts` 的完整加载/校验流程（仅按需查了 hook 路径解析与 debug_only 过滤）、`src/providers/skillrunner/zipTransport.ts` 的 zip 实现。
- 各 workflow.json 的业务语义、`literature-workbench-package/lib/*.mjs` 内部实现、skill 的 `scripts/*.py` 运行时。
- `tests/`、`openspec/`、`docs/`、`artifacts/` 中的相关规格与既有审计结论。
- 一次全仓 `grep -rn` 调用超时（60s）被终止；「无 npm script 封装」结论基于 `package.json` + `scripts/` + `src/` 定向检索，未覆盖 `.github/`、`docs/`、`openspec/`。
