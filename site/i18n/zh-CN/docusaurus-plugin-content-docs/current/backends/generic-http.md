# Generic HTTP 后端配置

## 用途

Generic HTTP 后端用于发送原始 HTTP 请求到任意 URL。它不执行 Agent 技能，而是作为通用 HTTP 客户端使用。

## 主要场景：MinerU 文档解析

Generic HTTP 后端的主要用途是支持 **MinerU workflow**——一个 PDF 文档解析工作流。

MinerU 是一个文档解析服务，可以将 PDF 文件转换为 Markdown 格式。MinerU workflow 通过 Generic HTTP 后端向 MinerU 服务发送请求，获取解析结果。

### 配置 MinerU

1. 部署 MinerU 服务（参考 MinerU 项目的部署文档）
2. 打开 **工具 → [后端管理器](backend-manager)**
3. 切换到 **Generic HTTP** Tab
4. 点击 **添加 Generic HTTP**
5. 填写：
   - **显示名称**：如 "我的 MinerU 服务"
   - **Base URL**：MinerU 服务的地址（如 `http://127.0.0.1:8080`）
   - **认证方式**：如服务需要认证，选择 `bearer` 并填写令牌
   - **超时时间**：请求超时设置（可选）
6. 点击右下角 **保存**

## 配置项

| 字段 | 必填 | 说明 |
|------|------|------|
| 显示名称 | 是 | 后端的显示名称 |
| Base URL | 是 | HTTP 服务的基础地址 |
| Bearer Token | 否 | 认证令牌 |
| 超时时间 | 否 | 请求超时（毫秒） |

## 技术细节

Generic HTTP 后端支持：
- **单步请求**：`generic-http.request.v1` — 发送单个 HTTP 请求
- **多步流水线**：`generic-http.steps.v1` — 链式请求，支持 JSON 路径提取（`$.*` 表达式），将前一步响应中的值提取作为后续请求的参数
- **Multipart 上传**：支持文件上传
- 轮询和重试机制

## 下一步

- [了解 Workflow](../workflows/) — Generic HTTP 后端主要用于特定的 workflow
