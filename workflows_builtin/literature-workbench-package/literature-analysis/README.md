# Literature Analysis

## 用途

从 PDF 或 Markdown 附件生成文献摘要、参考文献列表和引文分析报告。

该 workflow 调用 Skill-Runner 后端的 `literature-analysis` skill，对学术文献进行结构化分析，产出可用于学术写作的参考资料。

## 输入约束

| 约束类型     | 说明                                                                |
| ------------ | ------------------------------------------------------------------- |
| 输入单元     | 附件 (attachment)                                                   |
| 接受类型     | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| 每父条目限制 | 最多 1 个附件                                                       |

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

- `request.sequence.steps[].mode`: `auto` - 各阶段非交互模式
- `poll_interval_ms`: 2000 - 轮询间隔 2 秒
- `timeout_ms`: 1200000 - 超时 20 分钟

## 运行产物

执行完成后，在父条目下创建 **3 个 Zotero Note**：

### 1. Digest Note

- **类型**: `data-zs-note-kind="digest"`
- **内容**:
  - HTML 渲染的文献摘要
  - Payload: base64 编码的原始 Markdown (`digest-markdown`)
- **更新策略**: 每次执行会更新同名 note（若已存在则覆盖）

### 2. References Note

- **类型**: `data-zs-note-kind="references"`
- **内容**:
  - 参考文献 HTML 表格（列：#、Year、Title、Authors、Source、Locator）
  - Payload: JSON 格式参考文献列表 (`references-json`)
- **更新策略**: 每次执行会更新同名 note

### 3. Citation Analysis Note

- **类型**: `data-zs-note-kind="citation-analysis"`
- **内容**:
  - 引文分析报告（Markdown 转 HTML）
  - Payload: JSON 格式分析数据 (`citation-analysis-json`)
- **更新策略**: 每次执行会更新同名 note

## 参数

| 参数       | 类型   | 说明     | 默认值  |
| ---------- | ------ | -------- | ------- |
| `language` | string | 输出语言 | `zh-CN` |

### 可选语言

`zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`

支持自定义输入（`allowCustom: true`）

## 依赖

- **后端**: Skill-Runner 服务
- **Backend 配置**: 在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**: Skill-Runner 端需部署 `literature-analysis` skill

## 相关工作流

- [literature-explainer](../literature-explainer/README.md): 交互式文献解读对话
- note-level `reference-note-editor` 和 `reference-matching` 已归档到 `deprecated/workflows_builtin`
