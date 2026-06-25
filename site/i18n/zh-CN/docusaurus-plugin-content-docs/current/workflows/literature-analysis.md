# 文献分析

## 用途

从 PDF 或 Markdown 附件生成文献摘要、参考文献列表和引文分析报告。

该 workflow 调用 Skill-Runner 后端的 `literature-analysis` skill，对学术文献进行结构化分析。

## 适用场景

- 阅读新论文时快速获取核心内容摘要
- 收集文献的完整参考文献列表
- 分析论文的引文上下文和引用意图

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 附件（attachment） |
| 接受类型 | `text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf` |
| 每父条目限制 | 最多 1 个附件 |

### 触发方式

- 直接选中一个 PDF 或 Markdown 附件
- 选中父条目，插件自动展开其第一个符合条件的附件

## 运行过程

```
1. 构建请求
   └── 上传源文件到 Skill-Runner
       └── 调用 skill_id: "literature-analysis"

2. Skill-Runner 处理
   └── 解析文档内容
       └── 生成三个输出：
           ├── digest.md          (文献摘要)
           ├── references.json    (参考文献列表)
           └── citation_analysis.json (引文分析)

3. 返回结果
   └── 下载 bundle (zip)
       └── 包含 result.json 和 artifacts/
```

### 执行模式

- `execution.mode`: `auto` — 自动执行，无需用户干预
- `skillrunner_mode`: `auto` — 非交互模式
- 超时：20 分钟

## 运行产物

执行完成后，在父条目下创建 **3 个 Zotero Note**：

### 1. 摘要笔记（Digest Note）

- 类型：`data-zs-note-kind="digest"`
- 内容：HTML 渲染的文献摘要，包含研究背景、方法、结果和结论
- 更新策略：每次执行会更新同名 note（若已存在则覆盖）

![文献分析摘要笔记](/img/docs/workflows/literature-analysis_digest.png)

### 2. 参考文献笔记（References Note）

- 类型：`data-zs-note-kind="references"`
- 内容：参考文献 HTML 表格（#、Year、Title、Authors、Source、Locator）
- 更新策略：每次执行会更新同名 note

![文献分析参考文献笔记](/img/docs/workflows/literature-analysis_references.png)

### 3. 引文分析笔记（Citation Analysis Note）

- 类型：`data-zs-note-kind="citation-analysis"`
- 内容：引文分析报告，包含引用上下文和引用意图分类
- 更新策略：每次执行会更新同名 note

![文献分析引文分析笔记](/img/docs/workflows/literature-analysis_citation-analysis.png)

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `language` | string | 输出语言 | `zh-CN` |

可选值：`zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`，也支持自定义输入。

## 依赖

- **后端**：Skill-Runner 服务
- **Backend 配置**：在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**：Skill-Runner 端需部署 `literature-analysis` skill

## 相关工作流

- [交互式文献解读](literature-explainer) — 与 AI 对话深入理解文献
- [导出/导入笔记](export-import-notes) — 导出或导入上述三类笔记
