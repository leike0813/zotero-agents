# STATE — OpenViking 项目知识初始化

- run_id: `20260916T1450Z`
- 依据：`artifacts/openviking_initialization_guide.md`
- 当前阶段：**阶段 7 已完成（回读与检索验收）；任务收尾**
- 最近更新：2026-09-16T23:30Z

## 0. 阶段进度

| 阶段 | 状态 | 产物 |
|---|---|---|
| 0 建立基线、确认工具与作用域 | 完成 | 本文件 §1-§3 |
| 1 建立全量覆盖清单 | 完成 | `inventory.csv`（11,137 行）、`inventory-summary.md` |
| 2 逐模块审阅与逻辑审计 | **部分完成** | `knowledge/_scout-*.md`（9 份，共约 4,500 行）+ 主会话定向深读；`zoteroHostCapabilityBroker.ts` 约 56% 行段未逐行 |
| 3 跨模块闭环与历史依据 | 部分完成 | `evidence.md`（51 条证据）；未做 bisect，测试红灯根因未定位 |
| 4 验证与发现分级 | 完成（覆盖面有限） | `validation.md`、`validation-*.log`、`findings.md` |
| 5 整理知识包和记忆候选 | 完成 | 8 份资源 + 6 条记忆 + `memory-candidates.yaml` |
| 6 写入 OpenViking | 完成 | `writes.jsonl`（14 次写入 + 1 次探测后删除） |
| 7 回读与检索验收 | 完成（工具级） | `retrieval-checks.md` |
| 最终汇报 | 完成 | `REPORT.md` |

**未完成 / 有限制的部分见 `REPORT.md` §2 与 §10。核心限制：9 个 Node 测试领域与全部真实 Zotero 层未运行；测试红灯根因未定位；未做真实新会话端到端召回验证。**

## 1. 审计基线（阶段 0）

| 项 | 值 |
|---|---|
| 项目根 | `/home/joshua/Workspace/Code/JavaScript/zotero-agents` |
| 项目标识 | `zotero-agents`（package.json name，version `0.9.0`）|
| 分支 | `research/e2e-historical-regressions` |
| HEAD | `d75221a75e1e40425edd20c1c5a198c6f1bb6975` |
| describe | `v0.8.3-430-gd75221a7` |
| 工作区未提交改动 | 仅 1 个未跟踪文件：`artifacts/openviking_initialization_guide.md`（本任务输入）。无已跟踪文件被修改。 |
| 未跟踪自研源码 | 无（`node_modules/`、`.codegraph/`、`.scaffold/`、`references/Zotero-*` 等按 .gitignore 排除，理由见 inventory） |
| Git 元数据 | `.git` 为文件（worktree/gitdir 指向 `/home/joshua/Git/JavaScript/zotero-agents.git`） |
| 追踪文件总数 | 11,137 |
| OS | Ubuntu 24.04.4 LTS，Linux 6.8.0-139-generic，x86_64 |
| Node / npm | v24.12.0 / 11.6.2 |
| Rust / Cargo | 1.92.0 / 1.92.0 |
| uv | 0.9.17 |

**审计对象说明**：本次审计对象是上述工作区当前状态（HEAD + 未跟踪审计输入），不是纯 HEAD 版本。已跟踪文件与 HEAD 一致。

### 子模块与外部引用边界

`git submodule status`：

| 路径 | commit | 说明 |
|---|---|---|
| `references/Skill-Runner` | `b89d366d…` (v0.7.6-8) | 外部参考基线，未审阅 |
| `references/Zotero-10` | `36749bd0…` (10.0.1) | 上游 Zotero 源码基线，未审阅 |
| `references/Zotero-7` | `188c54c1…` (7.0.32) | 上游 Zotero 源码基线，未审阅 |
| `references/Zotero-9` | `7132587c…` (9.0.6) | 上游 Zotero 源码基线，未审阅 |
| `skills_builtin/literature-analysis` | `5748a71e…` | 内置 skill 子模块 |
| `skills_builtin/literature-explainer` | `0a7306d1…` | 内置 skill 子模块 |
| `skills_builtin/literature-translator` | `11c3b357…` | 内置 skill 子模块 |

`packages/*` 是 npm workspaces（`synthesis-contracts`、`synthesis-engine`、`synthesis-repository`、`synthesis-application`），属于本项目自研，纳入审计范围。

## 2. 工具状态（阶段 0）

### CodeGraph

- CLI：`/home/joshua/.nvm/versions/node/v24.12.0/bin/codegraph`，`codegraph status` 可用。
- 项目：`/home/joshua/Workspace/Code/JavaScript/zotero-agents`（与当前 worktree 一致）。
- 索引：Files 2,143 / Nodes 58,446 / Edges 214,434 / DB 589.51 MB / node:sqlite WAL。
- 语言分布：typescript 1064、yaml 639、javascript 112、liquid 102、rust 102、python 72、tsx 51、xml 1。
- 状态：`✓ Index is up to date`；同时提示 `⚠ Index was built by an earlier version; re-index to pick up this engine's improvements.`。
  - 影响：图谱内容可能缺少新版本引擎才解析出的边（例如部分动态绑定）。**不重新索引**（指南禁止顺带重建索引；且重建属耗时/有副作用的操作）。
- 索引未覆盖：`addon/` 静态资源、`.ftl` 语言包、`openspec/` 规格文本、`docs/`、`skills_builtin/` 指令文本等非代码文件。这些用文件读取与 `rg` 补足。

### OpenViking

- `health` → `OpenViking is healthy (service initialized, storage: VikingFS)`。
- 服务地址来自环境变量 `OPENVIKING_URL`（值不记录），CLI 侧 `~/.openviking/ovcli.conf` 指向同一服务。
- 身份与作用域：DSH 记忆插件的 peer 由工作区 git remote 推导。
  - `~/.openviking/state/ws-identity-cbe8852a7caf.json` 记录 `cwd=/home/joshua/Workspace/Code/JavaScript/zotero-agents`、`remote=github.com/leike0813/zotero-agents`、`gitKind=repo`。
  - 实测捕获落盘 `peer_id = github.com-leike0813-zotero-agents`。
- 项目作用域记忆根：`viking://user/default/peers/github.com-leike0813-zotero-agents/memories/`
- 项目作用域资源根：`viking://user/default/peers/github.com-leike0813-zotero-agents/resources/`（**当前不存在，本次任务新建**）
- 既有项目知识：仅 1 个文件 —— `…/memories/entities/plugin/openviking_connectivity.md`（OpenViking 连通性与工具面备忘，非项目架构知识）。**不存在重复初始化风险**。

### 自动捕获边界（阶段 0.5）

已核实事实：

- 本会话正在被自动捕获。落盘位置 `~/.openviking/data/viking/default/user/default/sessions/dsh-a171cd1d-3596-4461-b2fe-c723c85ffe12/messages.jsonl`，`.meta.json` 显示 `message_count=16`、`pending_tokens=20318`、`commitTokenThreshold=20000`、`peer_id=github.com-leike0813-zotero-agents`。
- 自动召回已发生：同目录 `.recall_log.json` 记录了 9 条被注入的 URI（即会话开头的 `<openviking-context>` 块）。
- 捕获过滤规则（读 `@openviking/dsh-memory-plugin@0.3.2` 的 `capture.mjs` + `config.mjs`）：
  - 插件注入消息（`source.kind === "plugin"`）不捕获；
  - 工具结果不捕获（`captureToolResults` 默认 `false`）；
  - assistant 文本**会**被捕获（`captureAssistantTurns` 默认 `true`）；
  - `captureMode = "semantic"`，超阈值后 commit 并触发 LLM 语义记忆提取。
- `~/.openviking/ovcli.conf` 中的 `plugin.autoRecall=false` / `plugin.autoCapture=false` / `plugin.noAutoInject=true` **不约束** DSH 插件：DSH 插件只读自己的 config 与环境变量，不读 `ovcli.conf`。故该配置对本会话无效。
- **限制声明**：无法从本提示词或本会话阻止服务端从被捕获的 assistant 文本中提取记忆。因此本审计将：不把推测写成断言、不在正文写出敏感原文、并在最终报告中说明该限制。

## 3. 阻塞与限制

| ID | 状态 | 内容 |
|---|---|---|
| B-1 | 未阻塞，已记录 | CodeGraph 索引由旧版本引擎建立，可能缺边。已用源码阅读 + `rg` 补足，未重建索引。 |
| B-2 | 已发生的操作事故 | 读取 `~/.openviking/ov.conf` 结构时，脱敏正则未覆盖 `root_api_key` 键名形态（`"root_api_key": "…"`），导致该密钥明文出现在一次工具输出中。该输出已进入本会话（**并因此可能进入会话捕获记录**）。密钥值未写入任何审计文件、未写入 OpenViking。影响与处置建议见 `findings.md` F-SEC-1。 |

## 4. 下一步

本任务的三类产物均已交付：

1. **本地审计材料** —— 本目录全部文件；收尾状态见 `REPORT.md` §10。
2. **OpenViking 项目资源** —— 8 份，位于 `peers/github.com-leike0813-zotero-agents/resources/`。
3. **OpenViking 长期记忆** —— 6 条，位于 `peers/github.com-leike0813-zotero-agents/memories/entities/`。

后续会话接手时的入口：先读 `REPORT.md`，再按需读 `findings.md`（待决事项）与 `retrieval-checks.md`（已知失真）。

真正待人工处理的三件事：

1. **轮换 OpenViking `root_api_key` 并复核会话捕获记录**（见 B-2 / F-SEC-1）。
2. **决定两个测试领域的 73 个失败是缺陷还是预期红状态**（F-BEHAV-1）。
3. **决定是否安排 Host Bridge CLI 重新预构建**（F-DOC-1）。

工作区状态：已跟踪文件零修改，HEAD 未变；新增仅本审计目录（未跟踪）。
