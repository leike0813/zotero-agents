# MinerU PDF 解析

## 用途

调用 MinerU 服务解析 PDF 文档，提取高质量的 Markdown 文本和图片，产出可直接阅读的笔记文件。

MinerU 是基于深度学习的 PDF 解析工具，能从学术论文中提取高质量的文本和图表。

## 使用场景

- PDF 格式的文献需要转为可编辑的 Markdown
- 为后续 workflow（如文献分析、深度阅读）准备纯文本文档
- 提取 PDF 中的图片和表格

## 配置 MinerU 后端

### 1. 注册 MinerU 账号并获取 API Token

1. 访问 [mineru.net](https://mineru.net) 注册账号
2. 登录后进入 **API → API 管理** 页面
3. 创建或复制一个 API Token

### 2. 在后端管理器中添加后端

1. 打开 **工具 → [后端管理器](#doc/backends%2Fbackend-manager)**
2. 切换到 **Generic HTTP** Tab
3. 点击 **添加 Generic HTTP**
4. 填写以下字段：

| 字段 | 值 |
|------|-----|
| 显示名称 | `MinerU Official`（或其他你喜欢的名称） |
| Base URL | `https://mineru.net` |
| 认证方式 | `bearer` |
| 认证令牌 | 粘贴上一步获取的 API Token |
| 超时时间 | `600000`（10 分钟） |

5. 点击右下角 **保存**

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 附件（attachment） |
| 接受类型 | `application/pdf`（仅 PDF） |
| 冲突检测 | 若同目录已存在同名 `.md` 文件，则跳过该 PDF |

### 触发方式

- 直接选中一个或多个 PDF 附件
- 选中父条目，插件自动展开其子 PDF 附件

### 冲突处理

- 检查目标目录是否存在 `<PDF文件名>.md`
- 若存在，该输入在预处理阶段被跳过
- 若所有候选都冲突，workflow 不提交任何任务

## 运行过程

```
1. 申请上传 URL
   └── POST MinerU API 获取 batch_id 和 upload_url

2. 上传文件
   └── 二进制上传 PDF 文件

3. 轮询结果
   └── 重复查询直到处理完成或失败
       └── 间隔：2 秒

4. 下载结果
   └── 下载 bundle（zip 格式）

5. 本地物化
   └── 解压 bundle
       └── 提取 Markdown 内容
       └── 提取图片
       └── 重写 Markdown 中的图片路径为本地相对路径
       └── 写入 PDF 同目录
```

## 运行产物

### 1. Markdown 文件

- **位置**：PDF 同目录
- **命名**：`<原文件名>.md`
- **内容**：解析后的 Markdown 文本
- **编码**：UTF-8

### 2. 图片目录

- **位置**：PDF 同目录 `Images_<条目Key>/`
- **内容**：从 PDF 提取的图片文件

### 3. 链接附件

- **类型**：链接到本地文件
- **位置**：父条目下
- **目标**：`.md` 文件

### 清理逻辑

- 若目标目录已存在 `Images_<条目Key>/`，先删除旧目录再写入
- 避免重复创建已存在的 `.md` 链接附件

## 预估耗时

| PDF 规模 | 预估耗时 |
|---------|---------|
| 短论文（≤15 页） | 30 秒 - 1 分钟 |
| 常规（15-40 页） | 1-2 分钟 |
| 长论文（40+ 页） | 2-3 分钟 |

耗时主要取决于 MinerU 服务端的处理速度。

## 参数

MinerU workflow 无用户可配置参数。

## 模型建议

无需 LLM 模型。此 workflow 仅通过 HTTP API 调用 MinerU 服务。

## 依赖

- **后端**：MinerU 服务（Generic HTTP 后端）
- **Backend 配置**：在 Backend Manager 中配置 Generic HTTP 类型的后端
- **认证**：需要有效的 API Token（Bearer token）
- **MinerU 服务地址**：`https://mineru.net` 或其他部署实例

## 相关工作流

- [文献分析](#doc/workflows%2Fliterature-analysis) — 对解析后的 Markdown 生成摘要和引文分析
