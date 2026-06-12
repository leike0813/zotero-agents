# MinerU

## 用途

调用 MinerU 服务解析 PDF 文档，提取 Markdown 内容和图片，产出可直接阅读的笔记文件。

MinerU 是基于深度学习的 PDF 解析工具，能从学术论文中提取高质量的文本和图表。

## 输入约束

| 约束类型 | 说明                                        |
| -------- | ------------------------------------------- |
| 输入单元 | 附件 (attachment)                           |
| 接受类型 | `application/pdf` (仅 PDF)                  |
| 冲突检测 | 若同目录已存在同名 `.md` 文件，则跳过该 PDF |

### 触发方式

- 直接选中一个或多个 PDF 附件
- 选中父条目，插件自动展开其子 PDF 附件

### 冲突处理

- 检查目标目录是否存在 `<pdfBasename>.md`
- 若存在，该输入在 `filterInputs` 阶段被跳过
- 若所有候选都冲突，workflow 不提交任何 job

## 运行过程

```
1. 申请上传 URL
   └── POST /api/v4/file-urls/batch
       └── 返回 batch_id 和 upload_url

2. 上传文件
   └── PUT {upload_url}
       └── 二进制上传 PDF 文件

3. 轮询结果
   └── GET /api/v4/extract-results/batch/{batch_id}
       └── 重复直到 state === "done" 或 "failed"
       └── 间隔: poll_interval_ms (默认 2000ms)

4. 下载结果
   └── GET {full_zip_url}
       └── 下载 bundle (zip 格式)

5. 本地物化
   └── 解压 bundle
       └── 提取 full.md 和 images/ 目录
       └── 重写 markdown 中的图片路径
       └── 写入目标目录
       └── 创建链接附件
```

### MinerU API 流程

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  申请上传 URL    │───▶│   上传 PDF      │───▶│   轮询结果      │
│  POST /batch    │    │  PUT upload_url │    │  GET /batch/id  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                               ┌─────────────────┐
                                               │  下载 bundle    │
                                               │  GET full_zip   │
                                               └─────────────────┘
```

## 运行产物

### 1. Markdown 文件

- **位置**: PDF 同目录
- **命名**: `<原文件名>.md`
- **内容**: 解析后的 Markdown 文本
- **编码**: UTF-8

### 2. 图片目录

- **位置**: PDF 同目录 `Images_<itemKey>/`
- **内容**: 从 PDF 提取的图片文件
- **引用**: Markdown 中的 `images/...` 已改写为 `Images_<itemKey>/...`

### 3. 链接附件

- **类型**: 链接到本地文件 (linked attachment)
- **位置**: 父条目下
- **目标**: `.md` 文件
- **MIME**: `text/markdown`

### 清理逻辑

- 若目标目录已存在 `Images_<itemKey>/`，先删除旧目录
- 避免重复创建已存在的 `.md` 链接附件

## 执行参数

| 参数               | 来源            | 说明                           |
| ------------------ | --------------- | ------------------------------ |
| `timeout_ms`       | workflow.json   | 请求超时 600000ms (10分钟)     |
| `poll_interval_ms` | workflow.json   | 轮询间隔 2000ms                |
| Token              | Backend profile | Bearer token 来自 backend 配置 |

## 依赖

- **后端**: MinerU 服务 (通用 HTTP backend)
- **Backend 配置**: 在 Backend Manager 中配置 generic-http 类型后端
- **Auth**: 需要 bearer token 认证

## MinerU 服务

- 公共 API: `https://api.mineru.cn` (或其他部署实例)
- 需要有效的 API token
- Token 在 backend profile 的 auth 中配置

## 相关工作流

- [literature-analysis](../literature-analysis/README.md): 生成文献摘要
