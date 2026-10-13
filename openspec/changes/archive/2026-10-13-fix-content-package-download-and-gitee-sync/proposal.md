# Proposal

## Why

内容包下载缺少超时和字节进度，主源停滞会阻塞镜像回退，失败信息还可能被首选项状态刷新覆盖。已发布的 v0.8.8 只有 dev 产物，现有 Gitee 同步入口却同步插件并要求三个频道齐全。

## What Changes

- 为 feed 和 ZIP 请求设置有界等待，按主源、镜像顺序回退并保留各地址失败原因。
- 共享真实下载进度，确保失败反馈和按钮恢复不受异步状态刷新影响。
- 主 feed 成功立即使用，失败才读取镜像，统一规格与现有主源权威语义。
- 增加 content-only 同步入口，验证实际已发布频道的完整产物配对，使用原始 GitHub 资产并验证 Gitee 镜像。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `content-package-subscription`: 有界请求、主源优先、下载字节进度与稳定失败反馈。
- `content-package-release`: 内容包独立镜像同步、按已发布频道验证资产与不可变复制。

## Impact

涉及内容包安装器、hooks、首选项 UI、既有订阅/UI/发布脚本测试与工作流文档。进度及失败结果仅新增可选字段，feed 和安装状态持久化格式不变；不增加依赖，不发布插件或重新构建已发布内容包。
