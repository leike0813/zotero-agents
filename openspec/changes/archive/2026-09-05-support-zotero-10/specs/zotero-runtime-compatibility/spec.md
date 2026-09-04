## Purpose

定义 Zotero Agents 插件可安装的 Zotero 主版本范围，以及各运行时表面如何用同一语义报告宿主版本并保持插件环境兼容。

## ADDED Requirements

### Requirement: 插件 SHALL 支持 Zotero 7、9 与 10

插件清单 SHALL 允许安装在 Zotero 7、9 和 10 正式版，并拒绝超出该维护版本声明范围的宿主版本。

#### Scenario: 支持范围内安装
- **WHEN** 用户在 Zotero 7、9 或 10 正式版安装插件
- **THEN** 安装清单 SHALL 接受该宿主版本

#### Scenario: 支持范围外安装
- **WHEN** 用户在低于 Zotero 7 或高于 Zotero 10 的宿主版本安装插件
- **THEN** 安装清单 SHALL 拒绝该宿主版本

### Requirement: 运行时 SHALL 统一归一化 Zotero 主版本

需要发布宿主版本元数据的运行时表面 SHALL 将 Zotero 7、9 和 10 分别归一化为稳定主版本值，并将其他或不可解析值归类为 unknown。

#### Scenario: 已支持的主版本
- **WHEN** 宿主版本字符串以 7、9 或 10 作为语义主版本
- **THEN** 所有运行时消费者 SHALL 得到对应的 `7`、`9` 或 `10`

#### Scenario: 未识别的主版本
- **WHEN** 宿主版本缺失、不可解析或不在已支持集合中
- **THEN** 所有运行时消费者 SHALL 得到 `unknown`

### Requirement: 兼容实现 SHALL 保持 Zotero 插件运行时边界

Zotero 10 兼容实现 SHALL 继续使用 Zotero/Gecko 可用的宿主 API，不得向插件运行路径引入仅 Node.js 环境可用的模块或全局对象。

#### Scenario: 插件代码在 Zotero 中加载
- **WHEN** Zotero 7、9 或 10 加载插件运行时代码
- **THEN** 兼容路径 SHALL 不依赖 Node.js 专属 API
