# Zotero Librarian Hermes Profile

## 概述

**zotero-librarian** 是一个可直接安装的 [Hermes](https://github.com/anomalyco/hermes) Profile，让 AI 助手通过 [Host Bridge](host-bridge) 来管理你的 Zotero 文献库。Profile 包含 Agent 所需的一切：`zotero-bridge` CLI、Host Bridge 连接配置模板、本地 SQLite 元数据索引、工作流目录缓存、运行监控脚本以及定时维护 cron 任务。

Profile 从独立仓库 [leike0813/zotero-librarian-profile](https://github.com/leike0813/zotero-librarian-profile) 发布。源码开发位于 [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents)。

## 能做什么

| 功能 | 说明 |
|------|------|
| **本地元数据索引** | 维护 Zotero 文献库的可搜索 SQLite 快照——标题、作者、标签、合集、DOI、笔记/附件数量——支持快速、可离线的查询 |
| **工作流目录缓存** | 本地缓存所有内置工作流的 payload 契约，Agent 可直接提交已知工作流，无需每次都重新查询其 schema |
| **定时维护** | 六项内置 cron 模板：索引刷新、工作流目录刷新、运行监控、入库三问、库健康检查、关注队列摘要 |
| **运行监控** | 追踪已提交的工作流运行，报告状态变更、终态或需要关注的事项 |
| **关注队列** | 将 Host Bridge 的 `insights.get_attention_queue` 与本地索引数据结合，呈现高优先级阅读和分析任务 |

## 安装

### 前置条件

- 已安装 [Zotero](https://www.zotero.org/) 7+ 和 **Zotero Agents** 插件
- Host Bridge 已启动（检查方式：Zotero → 设置 → Zotero Agents → Host Bridge → **启动/显示端点**）
- 系统已安装 [Hermes](https://github.com/anomalyco/hermes)
- `zotero-bridge` CLI 可用（可通过 Host Bridge 设置面板的 **安装 CLI** 按钮安装）

### 安装 Profile

```bash
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

此命令会下载 Profile 包并解压到你的 Hermes profiles 目录中。

### 配置 Hermes

编辑 Profile 内的 `config.yaml` 来设置模型提供商：

```yaml
# 在已安装的 profile 目录中
provider:
  type: anthropic    # 或 openai、local 等
  model: claude-sonnet-4-20250514
  # ... API key 和其他提供商配置
```

完整的提供商配置选项请参阅 [Hermes 文档](https://github.com/anomalyco/hermes)。

### 配置 Zotero Bridge 连接

Profile 附带 Host Bridge 连接模板文件 `assets/host-bridge/profile.example.json`。你需要提供实际的 endpoint 和 token：

1. 打开 Zotero → 设置 → Zotero Agents → Host Bridge
2. 点击 **启动/显示端点**，确保 Bridge 正在运行并记下端点 URL（如 `http://127.0.0.1:26570/bridge/v1`）
3. 点击 **复制 Master Token**（或使用面板中显示的会话 token）
4. 将 token 设置为环境变量：

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<your-token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<your-token>"
```

5. 远程/LAN 访问时，还需指定 endpoint：

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

Profile 模板使用 `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`，因此 CLI 会自动从环境变量中读取 token。详细的 endpoint、token 和 profile 文件说明请参阅 [Host Bridge 配置](host-bridge)。

### 验证安装

```bash
# 检查 Host Bridge 连接
zotero-bridge status

# 安装 CLI 二进制文件到 profile（仅首次）
python scripts/install_zotero_bridge_cli.py

# 初始索引刷新（拉取全部文献元数据到本地 SQLite）
python scripts/zotero_librarian_index_service.py refresh

# 测试本地索引搜索
python scripts/zotero_librarian_index_service.py search "机器学习"
```

## 索引服务命令

Profile 的核心工具是 `zotero_librarian_index_service.py`。它维护一个本地 SQLite 数据库，支持快速、频繁的文献库查询，无需每次调用 Zotero。

| 命令 | 说明 |
|------|------|
| `refresh` | 分页拉取 `zotero-bridge library snapshot` 并原子性地更新 SQLite 索引。最新刷新中缺失的条目会被标记为已删除。 |
| `search "<关键词>"` | 在标题、作者、标识符、标签、合集和出版字段中全文搜索 |
| `item <key-or-id>` | 按 Zotero item key 或数字 ID 返回单条索引记录 |
| `stats` | 报告存活/已删除条目数、标签数、合集数和工作流目录状态 |
| `workflow-refresh` | 调用 `workflow list` 和 `workflow describe` 更新本地工作流目录缓存 |
| `workflow-show <id>` | 显示已知工作流的缓存 payload 契约 |
| `run-register --run-id <id> --workflow-id <id>` | 注册一个已提交的工作流运行到监控系统 |
| `run-watch` | 检查所有活跃的已注册运行，报告状态变更或终态 |

## 应用场景

### 文献库管理

**每日入库三问**（`cron/inbox-triage.yaml`）

每日运行的入库三问 cron 会检查库中新条目的完整性：

- 状态为 `0-inbox`（未处理）的条目
- 缺少标签或合集归属的条目
- 缺少 DOI、URL 或附件文件的条目
- 缺少摘要/研读产物的条目

它会生成建议操作的报告，但在你批准之前不会对 Zotero 做任何修改。

**每周文献库健康检查**（`cron/library-hygiene.yaml`）

每周一运行，扫描文献库数据质量问题：

- 重复条目（按 DOI、标题或 ISBN 判断）
- 可疑的乱码标题
- 孤立条目（没有所属合集）
- 空合集
- 单个条目标签数过多
- 异常的 Zotero item type

所有建议均为只读，直到你批准修正操作。

**关注队列**（`cron/attention-queue.yaml`）

将 Host Bridge 的 `insights.get_attention_queue` 与本地索引元数据结合，呈现高优先级任务排名——需要阅读的文献、需要补充的元数据、需要运行的工作流。

### 文献搜索入库

1. 先搜索本地索引，避免重复添加已有文献：
   ```bash
   python scripts/zotero_librarian_index_service.py search "注意力机制综述"
   ```

2. 若未找到，使用 `literature-search-ingest` 工作流从外部源搜索并入库：
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"注意力机制综述","searchMode":"arxiv-and-doi"}'
   ```

3. 入库后，运行 tag-bootstrapper 或 tag-regulator 工作流对新条目进行标签规范化。

### 自动文献分析工作流

Profile 缓存了 Zotero Agents 插件中所有内置工作流。刷新目录后，可直接提交任意工作流，无需每次都查询其 schema。

**批量文献分析**

对一批文献提交 `literature-analysis` 工作流，生成结构化摘要：

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"zh-CN"}'
```

注册并监控运行：

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**单篇深度阅读**

对单篇文献进行深入分析：

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"zh-CN","mode":"comprehensive"}'
```

**跨文献主题综述**

对一批文献进行跨论文主题综述：

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"自监督学习","language":"zh-CN"}'
```

**翻译辅助**

翻译文献元数据或摘要：

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"zh-CN","mode":"metadata"}'
```

**论文问答**

对文献内容进行提问：

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"zh-CN"}'
```

## 定时维护任务

Profile 在 `cron/` 目录中包含六项预配置的 cron 模板：

| Cron 任务 | 执行计划 | 行为 |
|-----------|---------|------|
| `index-refresh` | 每 6 小时 | 分页拉取 `library snapshot` 保持本地 SQLite 索引为最新。无变化时返回 `[SILENT]`。 |
| `workflow-catalog-refresh` | 每天 03:00 | 调用 `workflow list` + `workflow describe` 更新工作流目录缓存。无变化时返回 `[SILENT]`。 |
| `run-monitor` | 每 5 分钟 | 调用 `run-watch` 检查活跃的已注册运行。仅报告状态变更、终态或需要关注的事项。 |
| `inbox-triage` | 每天 09:00 | 搜索 `status:0-inbox` 条目、缺失标签、缺失合集、缺失元数据。生成只读报告。 |
| `library-hygiene` | 每周一 | 扫描重复条目、孤立条目、空合集和数据质量问题。 |
| `attention-queue` | 每天 18:00 | 将关注队列 insights 与本地索引数据结合，排列高优先级任务。 |

所有无交互的维护任务使用 `[SILENT]` 标记，在无可操作结果时避免打扰用户。

## 安全边界

- Profile 模板（`profile.example.json`）从不包含真实 token。始终使用 `ZOTERO_BRIDGE_TOKEN` 环境变量。
- 维护 cron 任务默认为只读。任何修改操作都需要明确的用户批准。
- 绝不直接读取 Zotero 数据库文件。始终通过 Host Bridge、`zotero-bridge` 以及由 `library.sync_snapshot` 生成的本地索引来操作。

## 下一步

- [Host Bridge](host-bridge) — `zotero-bridge` CLI 和 Host Bridge 能力的完整参考
- [工作流](../workflows) — 所有内置和自定义工作流概览
- [MCP Server](mcp-server) — 面向 MCP 兼容客户端的替代协议接口
