# MCP Server

## 概述

MCP（Model Context Protocol）Server 是插件内嵌的标准化协议服务，将 Zotero 文献库和 Synthesis 功能暴露为 40+ 个 MCP 工具。MCP 兼容的客户端（Claude Desktop、Cursor、VS Code 扩展等）可以直接调用 Zotero 数据。

MCP Server 与 Host Bridge 共享底层能力注册表，但遵循 MCP 协议规范（Streamable HTTP 传输、JSON-RPC 2.0）。

## 配置

Zotero → 设置 → Zotero Agents → Host Bridge → **启用 MCP Server**

单个复选框控制启停。默认开启。

### 非可配默认值

| 设定 | 值 | 原因 |
|------|-----|------|
| 监听地址 | `127.0.0.1` | 安全：仅 loopback |
| Origin 校验 | 严格模式 | 仅允许 `127.0.0.1`、`localhost`、`[::1]` |
| 请求大小限制 | 1 MB | 内存保护 |
| 写入保护 | 启用 | 所有写入操作需审批 |

## 安全

- **Bearer Token 认证**：与 Host Bridge 共享同一会话 Token / Master Token
- **loopback 仅限**：无远程访问可能
- **Origin 校验**：拒绝跨域请求（403）
- **1 MB 限流**：超大请求体直接 413 拒绝
- **单线程队列**：1 在跑 + 8 排队，运行超时 45s，排队超时 30s
- **熔断器**：5 分钟内 3 次失败 → 该工具暂停 60s

## 连接 MCP 客户端

### 端点

```
http://127.0.0.1:<port>/mcp
```

端口动态分配（26370-26569 范围）。查看偏好设置中的 Host Bridge 端点获取实际端口号。

### Claude Desktop 配置示例

```json
{
  "mcpServers": {
    "zotero-skills": {
      "type": "http",
      "url": "http://127.0.0.1:26370/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

Token 在偏好设置 → Host Bridge → **复制 Master Token** 获取。

### 协议细节

- 传输：Streamable HTTP（`POST /mcp`）
- 版本：`2025-06-18`
- 服务标识：`zotero-skills` / `"Zotero Agents Context Broker"` v0.4.0
- `GET /mcp` → 405（仅接受 POST）
- 无 `id` 的请求视为通知（无响应）
- `id: null` → 显式无效

## 工具清单

<details>
<summary>全部 40+ 工具</summary>

### 读工具

| 工具 | 说明 |
|------|------|
| `get_current_view` | 当前 Zotero 视图信息 |
| `get_selected_items` | 当前选中条目摘要 |
| `search_items` | 搜索条目（limit ≤ 50） |
| `list_library_items` | 分页列出条目 |
| `get_item_detail` | 获取条目完整元数据 |
| `get_item_notes` | 列出条目子笔记 |
| `get_note_detail` | 读取笔记正文（分块，每块 ≤16k 字符） |
| `list_note_payloads` | 列出笔记中的 workflow payload |
| `get_note_payload` | 读取一个 payload |
| `get_item_attachments` | 获取附件清单（不含文件字节） |
| `prepare_paper_reading_context` | 聚合一篇论文的元数据、笔记、payload、附件 |

### 写工具（需审批）

| 工具 | 说明 |
|------|------|
| `preview_mutation` | 预览写入操作（不执行） |
| `update_item_fields` | 更新条目的允许字段 |
| `add_item_tags` | 为一个或多个条目添加标签 |
| `remove_item_tags` | 移除标签 |
| `create_child_note` | 创建子笔记 |
| `update_note` | 更新笔记正文 |
| `create_markdown_note` | 创建带 HTML 渲染 + base64 markdown payload 的笔记 |
| `update_markdown_note` | 更新已有的 markdown 笔记 |
| `ingest_paper` | 通过 DOI/arXiv/PMID/ISBN 导入论文（含 PDF 附件） |
| `add_items_to_collection` | 将条目加入合集 |
| `remove_items_from_collection` | 从合集移除条目 |

### 诊断工具

| 工具 | 说明 |
|------|------|
| `get_mcp_status` | 服务诊断：队列、熔断器、最近请求 |

### Synthesis 工具

| 工具 | 说明 |
|------|------|
| `topics.list` | 列出所有主题 |
| `topics.find_by_paper_ref` | 按论文引用查找关联主题 |
| `topics.get_context` | 获取主题完整上下文 |
| `topics.get_review_input` | 组装主题审核包 |
| `schemas.get` | 获取 schema 定义 |
| `concepts.query` | 查询概念知识库 |
| `citation_graph.query_cluster` | 查询引文簇 |
| `citation_graph.get_overview` | 图谱概况 |
| `citation_graph.get_slice` | 提取子图 |
| `citation_graph.get_metrics` | 图谱指标（pagerank、foundation、frontier） |
| `citation_graph.rank_external_references` | 排序外部引用 |
| `citation_graph.rank_library_papers` | 排序库内论文 |
| `library_index.get` | 库索引（分页） |
| `resolvers.resolve` | 解析引用/topic 解析器 |
| `reference_index.get` | 引用索引 |
| `paper_artifacts.get_manifest` | 获取产物清单 |
| `paper_artifacts.read` | 读取产物内容 |
| `paper_artifacts.export_filtered` | 导出过滤产物 |
| `paper_artifacts.resolve_topic_digest` | 解析主题摘要 |
| `insights.get_attention_queue` | 获取待关注队列 |

</details>

## 写入保护

写入工具遵循与 Host Bridge 相同的审批模型：

```
MCP 客户端调用写入工具
  │
  ├── Bearer Token 校验
  ├── 提取工具作用域
  ├── 审批检查：
  │     ├── 只读工具 → 直接执行
  │     ├── 已预批准写入 → 直接执行
  │     └── 需要审批 → 排队到 Zotero UI
  └── 执行 / 拒绝
```

队列限制：最多 50 条待审批；5 分钟内拒绝 >10 条写入 → 触发熔断（禁用 30s）。

## 下一步

- [Host Bridge](host-bridge) — MCP Server 的底层传输和 CLI 工具
- [偏好设置](../preferences) — 查看 MCP Server 设置项
