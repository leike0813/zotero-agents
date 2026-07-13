# 文献翻译

## 用途

将文献附件（Markdown 或 PDF）翻译成指定的目标语言，生成翻译后的 Markdown 文件和双语对齐数据。强烈建议先使用 [MinerU](#doc/workflows%2Fmineru) 将 PDF 转换为 Markdown，以获得显著更好的翻译质量。

## 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `target_language` | 否 | 目标语言（默认：`zh-CN`）。支持：`zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`。接受自定义值。 |
| `mode` | 否 | 翻译模式：`fast`（默认）或 `high_quality`（较慢）。 |

接受的附件类型：`text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf`。

### 触发方式

- 直接选择附件（PDF 或 Markdown）
- 选择父条目 — 插件自动查找第一个符合条件的附件
- 每个父条目仅处理一个附件
- 目标语言中已有翻译的条目会自动跳过

## 工作过程

1. 从选择中解析目标附件（直接附件或父条目下的第一个符合条件的附件）。
2. 检查目标语言的翻译产物是否已存在；若存在则跳过。
3. 使用 `literature-translator` 技能将翻译任务提交到 Skill-Runner 后端。
4. 翻译流水线运行多个阶段：对齐分析、翻译执行和 QA 验证。
5. 将翻译后的 Markdown 文件写入与源文件相同的目录，命名为 `<source-name>_<target-language>.md`，并在父条目下创建链接附件。

该 workflow 完全自动运行，不会因用户干预而暂停。

## 输出与 Apply

| 产物 | 说明 |
|----------|-------------|
| 翻译后的 Markdown | 与源文件并列写入，命名为 `<source-name>_<target-language>.md` |
| 链接附件 | 在父条目下创建，指向翻译后的 Markdown |
| 对齐数据 | 技能工作空间中的双语对齐 JSON |
| 术语表 | 技能工作空间中提取的术语表 JSON |
| QA 报告 | 技能工作空间中的质量保证报告 JSON |

## 预计耗时

| 文件大小 | 预计时间 |
|-----------|---------------|
| 短论文（≤10 页） | 3–5 分钟 |
| 标准（10–30 页） | 5–10 分钟 |
| 长论文（30+ 页） | 10–18 分钟 |

## 模型建议

推荐使用具有子代理委派能力的模型。翻译流水线包括对齐分析、翻译执行和 QA 验证阶段。子代理委派可并行处理这些子任务，显著提高效率和翻译一致性。

## 依赖

- **后端**：Skill-Runner
- **技能**：`literature-translator`

## 相关 Workflow

- [MinerU PDF Parsing](#doc/workflows%2Fmineru) — 先将 PDF 转换为 Markdown 以获得更好的翻译质量
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 生成文献摘要和分析产物
