# MinerU

## 这个 Workflow 做什么？

调用 MinerU 服务解析 PDF 文档，提取高质量的 **Markdown 文本**和**图片**。产出的 Markdown 可直接阅读，也是后续 Literature Analysis、Deep Reading 等 workflow 的最佳输入格式。

MinerU 是基于深度学习的文档解析工具，对学术论文中复杂的公式、表格和排版有很好的识别效果。

## 前置准备

### 1. 注册 MinerU 账号并获取 API Token

1. 访问 [mineru.net](https://mineru.net) 注册账号
2. 登录后进入 **API → API 管理** 页面
3. 创建或复制一个 API Token

### 2. 在后端管理器中配置 MinerU

1. 打开 **工具 → [后端管理器](../backends/backend-manager/README.md)**
2. 切换到 **Generic HTTP** Tab
3. 点击 **添加 Generic HTTP**
4. 填写以下字段：

| 字段 | 值 |
|------|-----|
| 显示名称 | `MinerU Official`（或其他你喜欢的名称） |
| Base URL | `https://mineru.net` |
| 认证方式 | `bearer` |
| 认证令牌 | 粘贴上一步获取的 API Token |
| 超时时间 | `60000`（60 秒） |

5. 点击右下角 **保存**

配置完成后即可使用 MinerU workflow。

## 怎么输入？

- **直接选中 PDF 附件**：选中一个或多个 PDF 文件，右键运行此 workflow
- **选中父条目**：插件自动找到其下所有 PDF 附件
- **自动跳过冲突**：如果 PDF 同目录已存在同名 `.md` 文件，该 PDF 会被跳过。如果所有候选都冲突，不提交任何任务

只接受 `application/pdf` 类型的附件。

## 执行方式

全自动。提交后插件自动上传 PDF → 轮询解析结果 → 下载并物化产物。

## 需要多长时间？

| PDF 类型 | 预估耗时 |
|---------|---------|
| 短论文（≤15 页） | 30 秒 - 1 分钟 |
| 常规（15-40 页） | 1-2 分钟 |
| 长论文（40+ 页） | 2-3 分钟 |

耗时主要取决于 MinerU 服务端的处理速度。超时限制为 10 分钟。

## 产出什么？

### 1. Markdown 文件
- **位置**：PDF 同目录
- **命名**：`<原文件名>.md`
- **内容**：解析后的 Markdown 文本
- **编码**：UTF-8

### 2. 图片目录
- **位置**：PDF 同目录 `Images_<itemKey>/`
- **内容**：从 PDF 提取的图片文件
- Markdown 中的图片路径已自动改写为本地相对路径

### 3. 链接附件
- 在父条目下创建链接到 `.md` 文件的 Zotero 附件
- 已在同目录存在同名 `.md` 时跳过

## 参数说明

无用户可配置参数。

## 模型建议

无需 LLM 模型。此 workflow 仅通过 HTTP API 调用 MinerU 服务。

## 依赖

- **后端**：Generic HTTP（MinerU 服务）
- **认证**：需要有效的 MinerU API Token（在后端配置中填写）
- **服务地址**：`https://mineru.net` 或其他自部署实例

## 相关 Workflow

- [Literature Analysis](../literature-workbench-package/literature-analysis/README.md) — 对解析后的 Markdown 生成摘要和引文分析
- [Literature Deep Reading](../literature-workbench-package/literature-deep-reading/README.md) — 生成结构化精读视图
