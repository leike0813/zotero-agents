# Workflows 组件说明

## 目标

定义 Workflow 包（manifest + hooks）的加载、校验与执行入口，为 UI 与执行内核提供稳定输入。

配套 API 细节请同时参见 `doc/components/workflow-hook-helpers.md`。

## 目录结构

### 单 Workflow 目录（传统格式）

```text
workflows/
  <workflow-id>/
    workflow.json
    hooks/
      filterInputs.js   # 可选
      buildRequest.js   # 可选（声明式 request 无法覆盖时使用）
      normalizeSettings.js # 可选（workflow 专属设置归一化）
      applyResult.js    # 必需
```

### Workflow Package 目录（多 Workflow 包格式）

v0.3.0 新增，允许一个包内声明多个 workflow 并共享代码：

```text
workflows/
  <package-id>/
    workflow-package.json    # 包索引（必需）
    lib/                     # 共享代码目录
      runtime.mjs
      model.mjs
      ...
    <workflow-id-1>/
      workflow.json
      hooks/
        ...
    <workflow-id-2>/
      workflow.json
      hooks/
        ...
```

**workflow-package.json 格式**：

```json
{
  "id": "literature-workbench-package",
  "version": "1.0.0",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json"
    }
  },
  "workflows": ["literature-analysis", "tag-regulator"]
}
```

### Workflow package 多语言资源

Workflow 是可插拔包，workflow 自身的 label、任务名模板、参数标题/说明由 workflow 包负责本地化，不进入插件内置 `addon.ftl` / `preferences.ftl` 治理。插件只在 UI 边界生成 localized display projection；`workflow.id`、参数 key、request payload、hook runtime 输入和历史任务记录保持稳定。

v1 支持两种声明方式：

- 单个 workflow 可在 `workflow.json` 中声明 `i18n.messages`，key 使用 workflow-local 形式，例如 `label`、`taskNameTemplate`、`parameters.language.title`、`skills.literature-analysis.name`。
- 多 workflow package 可在 `workflow-package.json` 中声明 `i18n.locales`，指向包内 JSON 文件；locale 文件 key 使用 fully-qualified 形式，例如 `workflows.literature-analysis.label`、`workflows.literature-analysis.skills.literature-analysis.name`。

Workflow 负责声明当前 workflow 下的 skill 显示名。Skill 包的 `runner.json.name` 保持为该 skill 的默认名；当 workflow i18n 没有声明 `skills.<skillId>.name` 时，UI 回退显示 `runner.json.name`。

解析回退顺序固定为：精确 locale、语言子标签、`defaultLocale`、raw manifest 字符串、id/key fallback。

### Workflow display 元数据

`workflow.json` 可声明展示专用的 `display` 对象：

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  }
}
```

- `display.core` 表示核心 workflow。核心 workflow 在 workflow 菜单中排在非核心 workflow 上方，并在 Dashboard 首页显示 Core badge。
- `display.emoji` 是 locale-independent 的显示名前缀，由 manifest 所有，不进入 `i18n.messages` 或 package locale JSON。
- `display` 只影响 UI display projection；`workflow.id`、参数 key、request payload、hook runtime 输入、agent 输出和历史任务记录都不改写。

**包内 hook 可使用相对导入**：

```javascript
// hooks/applyResult.mjs
import { normalizeTag } from '../lib/model.mjs';
import { fetchRemote } from '../lib/remote.mjs';
```

**两种格式并存**：loader 同时支持传统单 workflow 目录和多 workflow 包目录。

## Official / Dev Local / User 目录治理（当前实现）

- Official 目录（订阅安装目标）：
  - `<runtimeRoot>/content/official/workflows`
  - 若 `Zotero.DataDirectory` 不可用，按平台回退到系统标准应用数据目录下的 `zotero-agents/content/official/workflows`
  - 该目录只接收订阅安装产物；插件启动不再从 XPI 内复制 `workflows_builtin`
- Dev Local 目录：
  - 优先使用 `ZOTERO_AGENTS_CONTENT_DEV_ROOT` 下的 `workflows_builtin` 或 `workflows`
  - 未设置环境变量时使用 `<runtimeRoot>/content/dev-local/workflows`
  - debug mode 只控制 `debug_only` workflow 是否可见，不控制是否扫描 dev-local
- 用户目录（`workflowDir`）：
  - 优先使用偏好值 `workflowDir`
  - 为空时默认 `<runtimeRoot>/content/user/workflows`
  - 插件启动时会预创建默认用户 workflow 目录，以及同级默认 user skill 目录
- `.env` 中的 `ZOTERO_PLUGIN_DATA_DIR` 不由插件业务代码直接读取：
  - 该变量由 scaffold 启动器消费
  - 最终体现为运行时的 `Zotero.DataDirectory.dir`

### 订阅安装安全约束

- 订阅安装仅写入 Official 目录，不会写入或清理 Dev Local 与 User 目录。
- official Workflow 包有效安装必须同时满足 install state 文件合法、official
  workflow root 存在，且其中仍能识别 `workflow.json` 或
  `workflow-package.json`。如果 state 文件存在但 official workflow 文件树缺失，
  运行时视为未安装，并暴露 stale install-state 诊断。
- 包内路径必须位于 `content-package.json`、`workflows/` 或 `skills/` 下。
- 安装采用 staging 目录替换目标目录：
  - 先完整写入 staging；
  - 再替换目标目录；
  - 若替换失败，保留/回退到上一次可用 official 内容。

## 官方 Workflow 包订阅与版本维护

官方 Workflow 包独立于插件本体发布。插件默认订阅独立发布仓库：

- GitHub：`https://github.com/leike0813/zotero-agents-workflows`，canonical
  发布源
- Gitee：`https://gitee.com/leike0813/zotero-agents-workflows`，best-effort
  fallback mirror
- Feed 分支：`content-feed`
- 默认入口：`stable/feed.json`

`content-feed` 分支只保存轻量 feed 元数据，不长期提交 zip 包。zip 包发布为
Release assets；feed 中的 `artifact.url` 指向 GitHub release asset，
`artifact.mirrors` 可指向 Gitee release asset。GitHub release asset 与
GitHub feed 发布成功即代表官方 Workflow 包主发布成功；Gitee release asset 与
Gitee feed mirror 是可用性 fallback，发布失败或滞后不应阻断 GitHub 主发布。
回滚通过修改 feed 指向旧 Release asset 完成，只要 sha256、size 与兼容性约束
通过，即使版本号低于当前已安装版本也允许安装。

### 三层版本

- 插件本体版本：`v<x>.<y>.<z>`。`x` 表示插件运行时或内容协议破坏性变化，
  `y` 表示向后兼容能力新增，`z` 表示 bugfix、UI、安装器或订阅逻辑修复。
- 官方 Workflow 包版本：独立 semver。仅 Workflow 包升级时只 bump 内容包版本，
  不 bump 插件版本。
- 内容运行时协议版本：`content_api`。当前插件支持版本为 `1.0.0`。Workflow
  包需要新运行时能力时，优先通过 `requires.content_api` 表达。

### Feed 与兼容性字段

每个 feed package 至少声明：

```json
{
  "id": "zotero-agents-official-workflows",
  "version": "0.1.0",
  "channel": "stable",
  "debug_content": false,
  "content_api": "1.0.0",
  "requires": {
    "plugin": ">=0.4.0 <0.5.0",
    "content_api": "^1.0.0",
    "zotero": ">=7 <10"
  },
  "artifact": {
    "url": "https://github.com/leike0813/zotero-agents-workflows/releases/download/official-workflows-v0.1.0/zotero-agents-official-workflows-0.1.0-stable.zip",
    "mirrors": [
      "https://gitee.com/leike0813/zotero-agents-workflows/releases/download/official-workflows-v0.1.0/zotero-agents-official-workflows-0.1.0-stable.zip"
    ],
    "sha256": "sha256:...",
    "size": 12345
  }
}
```

安装器在下载前检查 `requires.plugin`、`requires.content_api` 与
`requires.zotero`。不兼容的包不会安装；启动自动检查和偏好页会展示原因。
`artifact.path` 仅作为 dry-run、本地测试或旧 feed 的相对路径兼容入口。

### Channel 规则

- `stable`：默认用户源，排除 `debug_only`。
- `beta`：可选预览源，排除 `debug_only`。
- `dev`：开发者源，可包含 `debug_only`，安装仍要求 debug mode。

Prefs 的“官方 Workflow 包”区提供 channel 切换入口。普通模式只显示
`stable` 与 `beta`；`dev` 只在 debug mode 下显示/可选。若隐藏偏好中残留
`dev`，但当前未启用 debug mode，运行时有效 channel 回退为 `stable`，避免普通
用户启动检查或安装 dev feed。

客户端不提供任意 URL、revision 或本地历史版本回滚入口。回滚由发布端管理：
维护者将目标 channel 的 feed 指向旧 release asset 后，插件会把该 feed
识别为 rollback/replacement，只要 digest、size 与兼容性约束通过，即可安装。

插件运行时优先使用 GitHub primary feed。只有 primary feed 不可用时才使用
Gitee mirror；如果 primary 和 mirror 都可用但语义不一致，插件选择 primary，
并将 mirror mismatch 记录为 degraded fallback，而不是阻断更新。发布 gate 默认
只强校验 GitHub feed 与 GitHub release asset；Gitee mirror 校验是显式维护操作。

## Manifest（当前实现）

Manifest 契约由以下 schema 唯一定义（SSOT）：

- `src/schemas/workflow.schema.json`
- 该文件同时用于”作者编写参考”和”loader 运行时结构校验”

### workflow-package.json（Workflow Package 索引）

包索引契约由以下 schema 定义：

- `src/schemas/workflow-package.schema.json`

字段：
- `id`（必需）：包标识符
- `version`（必需）：版本号
- `workflows`（必需）：包内 workflow manifest 相对路径数组，例如 `literature-analysis/workflow.json`

### workflow.json（Workflow 声明）

最小合法示例：

```json
{
  "id": "minimal-pass-through",
  "label": "Minimal Pass Through",
  "provider": "pass-through",
  "hooks": {
    "applyResult": "hooks/applyResult.js"
  }
}
```

包含常见可选字段的示例：

```json
{
  "id": "declarative-skillrunner",
  "label": "Declarative SkillRunner",
  "provider": "skillrunner",
  "parameters": {
    "language": {
      "type": "string",
      "enum": ["zh-CN", "en-US"],
      "allowCustom": true,
      "default": "zh-CN"
    }
  },
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown"]
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "poll_interval_ms": 2000,
    "timeout_ms": 1200000,
    "feedback": {
      "showNotifications": true
    }
  },
  "result": {
    "fetch": {
      "type": "bundle"
    }
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis"
    },
    "input": {
      "upload": {
        "files": [{ "key": "source_path", "from": "selected.source" }]
      }
    }
  },
  "hooks": {
    "filterInputs": "hooks/filterInputs.js",
    "applyResult": "hooks/applyResult.js"
  }
}
```

说明：

- `hooks.applyResult` 必需。
- `hooks.normalizeSettings` 可选（用于 workflow 设置归一化，phase: `persisted` / `execution`）。
- buildRequest 能力必需，但实现方式二选一：
  - `hooks.buildRequest`
  - `request`（声明式）
- 例外：当 `provider = "pass-through"` 时，允许最小声明（仅 `hooks.applyResult`，可选 `hooks.filterInputs`），runtime 会补全 request。
- 两者同时存在时，优先 `hooks.buildRequest`。
- `provider` 必须显式声明，是 workflow 可用 backend 类型的唯一推断来源；`request.kind` 只描述请求协议/形状，不参与 backend 兼容性推断。
- `execution.feedback.showNotifications`（可选，默认 `true`）语义：
  - `false`：禁用 workflow 执行提醒 Toast（开始、单任务、结束汇总、跳过/失败提示）；
  - `true` 或缺省：显示非阻塞 sticky Toast，用户点击后关闭；同时最多显示 3 个 workflow 执行提醒 Toast。
- `execution.skillrunner_mode`（`auto|interactive`）语义：
  - 对 SkillRunner job 请求形状生效（`request.kind=skillrunner.job.v1`）；
  - 使用 `skillrunner.job.v1` 的 workflow 必填；
  - 当前会在执行链注入到请求的 `runtime_options.execution_mode`；
  - 不替代旧字段 `execution.mode`，两者语义并存。
- `parameters.<key>.allowCustom`（仅 `type=string` 生效）语义：
  - `true`：`enum` 作为推荐选项，settings UI 提供”推荐下拉 + 可编辑输入”，运行时允许非枚举字符串值；
  - `false` 或缺省：`enum` 作为硬约束，非枚举值会在归一化时回退默认值或被丢弃。
- `debug_only`（可选，布尔）语义：
  - `true`：workflow 仅在调试模式下可见（右键菜单不显示）；
  - `false` 或缺省：正常显示。

## 已废弃字段（会被视为非法 manifest）

下列字段已弃用，出现即视为无效 workflow：

- 顶层 `backend`
- 顶层 `defaults`
- `request.result`
- `request.create.engine`
- `request.create.model`
- `request.create.parameter`
- `request.create.runtime_options`
- `execution.supportedBackends`

## 声明式 request（当前支持）

由 `src/workflows/declarativeRequestCompiler.ts` 编译：

- `skillrunner.job.v1`
- `skillrunner.sequence.v1`
- `generic-http.request.v1`
- `generic-http.steps.v1`
- `pass-through.run.v1`

### pass-through.run.v1 关键约束

- `kind` 固定为 `pass-through.run.v1`
- 请求由 runtime/compiler 自动补全，包含：
  - 完整 `selectionContext`
  - `parameter`（workflow 参数）
  - `targetParentID/taskName/sourceAttachmentPaths`
- 对未声明 `inputs.unit` 的 pass-through workflow，默认按整份选择上下文执行；
  - 若过滤后仅包含 `notes` 且数量 > 1，会按“每 note 一单元”拆分；
  - 若过滤后仅包含 `parents` 且数量 > 1，会按“每 parent 一单元”拆分。

### skillrunner.job.v1 关键约束

- `request.create.skill_id` 必填
- `request.create.skill_id` 指向的 skill 必须存在于有效 plugin skill registry，
  且该 skill 本身通过 registry 校验
- `request.input.upload.files` 可选（仅 file-input workflow 需要）
- `files[].from` 当前支持：
  - `selected.markdown`
  - `selected.pdf`
  - `selected.source`（由当前输入单元筛选后的唯一源附件，支持 markdown/pdf）
- 每个 selector 在当前输入单元必须唯一命中，否则该输入单元报错/跳过
- 声明式编译会自动把 `files[].key` 写入 create body 的 `input.<key>`，值为 `uploads/` 根下相对路径（例如 `inputs/source_path/example.md`）
- `upload_files` 仅用于“本地文件路径 -> zip entry”映射；zip entry 与 `input.<key>` 路径必须一致

### skillrunner.sequence.v1 关键约束

- `request.sequence.steps[]` 至少包含 1 个 step
- 每个 step 必须声明 `id`、`skill_id`、`mode`
- 每个 step 的 `skill_id` 必须存在于有效 plugin skill registry，且对应 skill
  本身通过 registry 校验
- `result.final_step_id` 必须指向其中一个 step

## 输入筛选策略

- 声明式 `inputs` 负责一阶筛选（unit/mime/per_parent）
- 复杂裁决放到 `hooks.filterInputs`
- 若最终合法输入单元为 0，执行阶段会报“无合法输入”并进入跳过提示

## 运行时兼容

- loader 同时支持 Zotero 与 Node。
- 禁止在 loader 顶层静态引入 Node 内置模块（避免 Zotero 打包失败）。
- `provider = "pass-through"` 时，执行上下文使用本地虚拟 backend（无需配置 backend profile）。
- Provider/backend 兼容性由 `provider` 派生：
  - `provider = "acp"`：只能由 ACP backend 执行；
  - `provider = "skillrunner"`：当前可由 SkillRunner backend 或 ACP backend 执行；
  - 其他 provider：只匹配同名 backend type；
  - `request.kind` 不参与兼容性推断。
- Hook 加载策略：
  - Node：动态 import，失败回退到文本导出转换
  - Zotero：脚本加载器，失败回退到文本导出转换

### Hook 执行模式

- `precompiled-host-hook`：bundled hook，在宿主环境预编译后执行（v0.3.0 新增，支持包内相对导入）
- `legacy-text-loader`：传统文本转换加载
- `node-native-module`：Node 原生 ES 模块

### Runtime Context 字段（Hook 可访问）

Hook 接收的 `runtime` 对象包含：

- `handlers`：通用操作处理器
- `helpers`：Hook 辅助函数（见 `doc/components/workflow-hook-helpers.md`）
- `hostApi`：宿主 API（文件操作、通知等）
- `hostApiVersion`：API 版本号
- `zotero`：Zotero 全局对象
- `debugMode`：是否处于调试模式
- `workflowId`：当前 workflow ID
- `packageId`：所属包 ID（仅 workflow package）
- `workflowRootDir`：workflow 根目录绝对路径
- `packageRootDir`：包根目录绝对路径（仅 workflow package）
- `workflowSourceKind`：`"official" | "dev-local" | "user" | ""`
- `hookName`：当前执行的 hook 名称
- `fetch` / `Buffer` / `btoa` / `atob` / `TextEncoder` / `TextDecoder` / `FileReader` / `navigator`：浏览器/Node 兼容的全局能力

## Workflow 设置入口（当前实现）

- Workflow 设置改为“每个 workflow 独立设置页”，设置页内不再提供 workflow 下拉切换。
- 右键菜单中的 `Workflow Settings...` 为二级菜单，按 workflow 列出独立设置入口。
- 首选项页的 `Workflow Settings` 按钮会先弹出 workflow 列表，再进入对应 workflow 设置页。
- `Run Once` 默认值语义：
  - 每次打开某个 workflow 设置页时，Run Once 的 profile / workflow 参数 / provider 选项默认值都会从当前 Persistent 设置初始化；
  - 不提供单独的“是否跟随 Persistent”开关；
  - 重新打开设置页会重置待消费的一次性覆盖显示值，避免展示过期 Run Once 输入。
- `normalizeSettings` 钩子语义：
  - `phase = persisted`：用于持久化写入前的配置归一化；
  - `phase = execution`：用于执行前 workflow 参数归一化；
  - hook 返回 `undefined` 时，保持内核默认归一化结果。

### normalizeSettings 设计意图与适用场景

- 该钩子用于承载“workflow 专属配置语义”，避免把业务规则写进插件核心。
- 它不是某个 workflow 的专用能力；具体业务校验应由对应 workflow 自己提供。
- 适用场景（典型）：
  - 条件依赖：例如 `data_source=bbt-json` 时强制补默认端口；
  - 跨字段联动：A/B 互斥、C 由 D 推导；
  - 配置迁移：旧字段到新字段的兼容迁移；
  - 执行前稳态：清理非法值，确保本次运行参数可执行。
- 若 workflow 没有此类专属语义，可不提供该钩子。

## 失败语义

- 当输入经声明式规则与 `filterInputs` 处理后为空：workflow 跳过并返回 `no valid input units`。
- 当最小声明 workflow 既无 `request` 又非 `pass-through`：loader 视为无效并跳过。
- 当 provider/请求种类不匹配：执行期失败并进入任务失败汇总。

## applyResult 约束

- `applyResult` 通过 `bundleReader` 与 `runResult` 获取执行输出。
- 当 provider 返回 bundle 时，`bundleReader` 可提供：
  - `readText(entryPath)`
  - `getExtractedDir()`（用于目录级结果物化）
- 当 provider 仅返回 `resultJson`（无 bundle）时，`bundleReader.readText()` 会抛错，hook 应按 `runResult` 分支处理。

## Workflow Editor Host（新增）

- 核心新增通用 `workflowEditorHost`：
  - 统一管理编辑窗体生命周期（打开、保存、取消、销毁）；
  - 提供 renderer 分发（按 `rendererId`）与显式错误上报；
  - 对多输入触发场景按队列串行打开窗体（一次仅一个窗体）。
- 关闭语义（当前实现）：
  - 未修改直接关闭：直接关闭，不弹二次确认；
  - 已修改后关闭：弹出“是否保存修改”确认；
  - 选择保存：按 Save 路径序列化并返回；
  - 选择不保存：按未保存关闭返回。
- workflow 侧负责 renderer（业务 UI 与字段绑定），核心不再承载 workflow 专用编辑界面实现。
- 归档说明：旧的 `reference-note-editor` workflow 已从 active built-ins 移除；通用 editor host 仍可供其他 active workflow 使用。

## deprecated reference note workflows

`reference-matching` 和 `reference-note-editor` 已从 official workflow package 中移除，历史实现归档在 `deprecated/workflows_builtin/literature-workbench-package/`。

- active workflow registry 不再加载或展示这两个 workflow；
- stale workflow settings 不做迁移保真，除非用户自行安装同名 custom workflow，否则会被忽略；
- note-level citekey 回填不再是 active workflow 能力，引用整理由 Synthesis sidecar / Advanced Reference Matching 负责；
- references note 的 machine payload 仍可保留 `citekey` 字段，但可见 HTML 表格不再显示 Citekey 列。

### Reference 表格列映射（共享规则）

- active references-note writers 使用同一套 canonical `references-table` 渲染规则，列顺序为：
  - `#`、`Year`、`Title`、`Authors`、`Source`、`Locator`。
- `citekey` 可以保留在 `references-json` payload 中供 machine reader 使用，但不得作为可见表格列渲染。
- `Source` 列取值优先级（命中首个非空即停止）：
  - `publicationTitle` > `conferenceName` > `university` > `archiveID`。
- `Locator` 列由以下字段按固定顺序合并：
  - `volume`、`issue`、`pages`、`place`；
  - 渲染格式为：`Vol. <volume>; No. <issue>; pp. <pages>; <place>`（空字段跳过，不补占位）。

## mineru workflow（新增）

路径：`workflows/mineru/`

### 输入约束

- 输入单元是 PDF 附件；每个 PDF 独立一条请求任务。
- 直接选 PDF：一附件一任务。
- 选父条目：自动展开其子 PDF 附件并一附件一任务。
- 仅当目标目录存在同名 `<pdfBaseName>.md` 时，输入在 `filterInputs` 阶段被跳过。
- 若本次触发所有候选 PDF 都命中该冲突，则 workflow 不提交任何 job，执行汇总中 `skipped` 等于候选输入总数。
- 若仅部分候选命中冲突，则仅提交未冲突 PDF，执行汇总中 `skipped` 为被剔除数量。
- 若仅存在 `Images_<itemKey>` 目录而无同名 `.md`，不跳过。

### 请求链路

- provider 使用 `generic-http`，request kind 为 `generic-http.steps.v1`。
- 调用链路：
  - `POST /api/v4/file-urls/batch` 申请上传 URL
  - `PUT upload_url` 上传 PDF
  - `GET /api/v4/extract-results/batch/{batch_id}` 轮询状态
  - `GET full_zip_url` 下载 bundle bytes
- Token 不在 workflow 参数中维护，统一来自 backend profile 的 `auth.kind=bearer`。

### 结果物化

- 从 bundle 中读取 `full.md`，重命名为 `<pdfBaseName>.md` 并写回到 PDF 同目录。
- `images/` 重命名为 `Images_<itemKey>/` 并移动到 PDF 同目录。
- markdown 内 `images/...` 引用会改写为 `Images_<itemKey>/...`。
- 若目标目录已有同名 `Images_<itemKey>`，先删除旧目录，再落新目录。
- 物化成功后，把 `<pdfBaseName>.md` 以链接附件形式添加到 PDF 父条目下。
- 若父条目下已存在同路径 `<pdfBaseName>.md` 附件链接，`applyResult` 不会重复创建附件。
- bundle 缺少 `full.md` 时，当前任务直接失败，不做部分回写。

## 测试点（TDD）

- manifest 字段校验与废弃字段拒绝
- hooks 路径与导出函数校验
- `buildStrategy = hook | declarative` 分支行为
- 声明式 request 编译与输入映射约束
- Node/Zotero 双运行时 loader 行为

## 文档维护检查清单

- 修改 `src/workflows/types.ts` 中 `WorkflowHooksSpec` 或 `WorkflowManifest` 后，同步更新本文件的 manifest 契约章节。
- 修改 `src/workflows/loader.ts` 的 hook 载入策略或失败语义后，同步更新本文件的运行时兼容/失败语义章节。
- 修改 `src/workflows/helpers.ts` 中 canonical references 表格渲染逻辑后，同步更新本文件的”Reference 表格列映射”。

## Host API（Hook 可调用）

`runtime.hostApi` 提供以下能力（详见 `src/workflows/types.ts`）：

### 文件操作

- `hostApi.file.pathToFile(path)`：将路径转换为 File 对象
- `hostApi.file.readText(path)`：读取文本文件
- `hostApi.file.writeText(path, content)`：写入文本文件
- `hostApi.file.exists(path)`：检查文件是否存在
- `hostApi.file.makeDirectory(path)`：创建目录
- `hostApi.file.getTempDirectoryPath()`：获取临时目录路径
- `hostApi.file.pickDirectory(args?)`：选择目录（返回路径或 null）
- `hostApi.file.pickFile(args?)`：选择单个文件（返回路径或 null）
- `hostApi.file.pickFiles(args?)`：**v0.3.0 新增** 选择多个文件（返回路径数组或 null）

### 其他操作

- `hostApi.items.get/resolve/getByLibraryAndKey/getAll`：条目操作
- `hostApi.prefs.get/set/clear`：偏好设置操作
- `hostApi.parents/notes/attachments/tags/collections/command`：Handler 快捷访问
- `hostApi.editor.openSession/registerRenderer/unregisterRenderer`：编辑器会话
- `hostApi.notifications.toast`：通知提示
- `hostApi.logging.appendRuntimeLog`：运行日志

## Workflow Package Schema

包索引 `workflow-package.json` 的唯一契约来源：

- `src/schemas/workflow-package.schema.json`

字段约束：

- `id`（必需）：包标识符，非空字符串
- `version`（必需）：版本号，非空字符串
- `workflows`（必需）：子 workflow ID 数组，至少一个元素
