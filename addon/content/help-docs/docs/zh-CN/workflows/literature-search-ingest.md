# 文献搜索与入库

## 用途

通过 AI 搜索学术文献并将确认后的结果入库到 Zotero。`query` 留空时，可由引导模式通过对话把研究需求逐步收敛为经确认的搜索 brief。

## 搜索模式

| 模式 | 说明 |
|------|------|
| `auto` | 非空查询时自动判断；空查询时自动进入引导模式。 |
| `guided` | 澄清研究需求、只读检查本地 Zotero/Synthesis 覆盖，并直接执行确认后的 brief。 |
| `topic_expansion` | 按研究方向或主题搜索。 |
| `paper_seed_expansion` | 基于种子论文扩展搜索。 |
| `targeted_ingest` | 精确定位并导入单篇文献。 |

## 运行过程

```
1. 引导规划（空 query + auto 或 guided）
   └── 以短轮次澄清研究目标
   └── 只读查询本地 Zotero/Synthesis 覆盖
   └── 展示结构化 search brief
   └── 等待确认；确认前不联网或写入

2. 候选搜索与选择
   └── 按确认的 brief 或显式模式搜索
   └── 核验 identifier、权威元数据、landing page 和合法公开 PDF 线索
   └── 用户选择要入库的文献

3. 入库与完成
   └── 通过 zotero-bridge 逐篇入库
   └── 输出包含缺 PDF 链接的简洁结果 JSON
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|------|
| `query` | string | 搜索主题、论文标识、种子；留空可启动引导规划。 | 空 |
| `searchMode` | string | `auto`、`guided`、`topic_expansion`、`paper_seed_expansion`、`targeted_ingest`。 | `auto` |
| `targetCollection` | string | 目标 Collection（可选）。 | 空 |

## 产出

- 候选在用户确认入库前会完成证据核验。
- 成功条目写入 Zotero；无 PDF 时保留合法 landing page 线索。
- 引导模式的最终结果为 `search_mode: "guided"`。

## 依赖

- **后端**：支持 interactive 的 ACP 后端
- **Skill**：`literature-search-ingest`
