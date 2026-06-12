# Skill-Runner 部署与配置

## 什么是 Skill-Runner？

Skill-Runner 是一个独立的 Agent 技能执行服务。Zotero Skills 通过 HTTP API 与 Skill-Runner 通信，提交技能请求并获取结果。

## 部署模式

Skill-Runner 支持两种部署模式。

### 托管本地模式（推荐）

插件提供一键部署/启动/停止功能，自动管理 Skill-Runner 的生命周期。

**部署步骤：**

1. 打开 **Zotero → 设置 → Zotero Skills**
2. 找到 **SkillRunner Local Backend** 区域
3. 点击 **一键部署**（如果尚未安装）
   - 插件自动从 GitHub Release 下载最新版本
   - 安装到插件数据目录
   - 完成后状态变为"已安装"
4. 点击 **启动**
   - 默认地址：`http://127.0.0.1:29813`
   - 如果端口被占用，自动尝试后续 10 个端口

**操作按钮说明：**

| 按钮 | 功能 |
|------|------|
| 部署 | 下载并安装 Skill-Runner 运行时 |
| 启动 | 启动本地 Skill-Runner 进程 |
| 停止 | 停止正在运行的 Skill-Runner 进程 |
| 卸载 | 移除已安装的运行时文件 |
| 打开管理 UI | 在侧边栏中打开 Skill-Runner 内置 Web 管理界面 |
| 打开技能文件夹 | 打开存放技能文件的目录 |
| 刷新模型缓存 | 刷新后端模型列表缓存 |
| 打开调试控制台 | 查看后端日志输出 |

### 远程模式

连接到远程或云托管的 Skill-Runner 实例。

**配置步骤：**

1. 打开 **工具 → 后端管理器**
2. 点击 **添加**
3. 在类型中选择 **SkillRunner**
4. 填写：
   - **显示名称**：友好的名称
   - **Base URL**：远程实例地址（如 `https://skill-runner.example.com`）
   - **Bearer Token**：认证令牌（如果后端需要认证）
   - **超时时间**：请求超时（可选）
5. 点击 **保存**

## 运行状态说明

| 状态 | 说明 |
|------|------|
| unknown | 初始状态，尚未检测 |
| starting | 正在启动 |
| running | 正常运行 |
| stopped | 已停止 |
| degraded | 运行异常 |
| reconciling_after_heartbeat_fail | 心跳检测失败，正在恢复 |

## 端口说明

- 默认端口：`29813`
- 回退范围：连续 10 个端口（29813-29822）
- 心跳间隔：20 秒
- 自动启动检测：每 15 秒检查一次

## 下一步

- [了解 Workflow](../workflows/) — Skill-Runner 是执行 Workflow 的主要后端
- [Dashboard 介绍](../dashboard) — 监控任务运行状态
