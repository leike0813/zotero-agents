# Design

## Context

Index 在 Workbench 中分批请求匹配来源和展示摘要。摘要还要经 Reverse Host 读取 Zotero 的生成产物。Reference 维护与 Index 同时访问宿主和 sidecar 存储。现有库仍需按原有 schema 版本打开。

## Goals / Non-Goals

**Goals**

- 让前台先看到有用的 Index 行，并在维护活动期间保持可控的读取成本。
- 让真正改变 Reference 投影的提交使旧游标失效，同时保留已接收内容和可操作的错误。
- 让诊断视图在持续轮询下仍能定位真实失败。

**Non-Goals**

- SkillRunner 连接恢复和 Joshua-Side 日常安装属于独立工作。

## Decisions

1. **匹配扫描与摘要读取独立推进。** 匹配扫描沿用串行 25 来源分页，摘要每批最多读取五个已知来源。工作台按查询代次接收结果。重试复用 Index 读取入口并回到首页。
2. **由 Reference 表的事务内修订号绑定游标。** Artifact、raw reference、binding 和 redirect 的增删改推进修订号，回滚也回滚修订号。Index 读取修订号和 Review 计数走读连接池，降低前台读取对写连接的竞争。
3. **限制 Reverse Host 就绪检查的单次工作量。** Index 就绪检查只投影生成产物。父条目的检查可有限重叠，Zotero 原生访问仍走共用串行队列。截止时间和取消传给同一个宿主读取信号。Reference 扫描复用有限并发的读取逻辑。
4. **复用诊断管道与 trace 分类。** Dashboard 使用本次插件启动时间限定全局日志，任务身份查询使用保留历史。trace 保留与默认视图使用同一分类，维护终态能覆盖先前的受理成功。Index 错误审计附带受控的读取投影。

## Risks / Trade-offs

- 大库与维护重叠时，摘要仍受宿主 I/O 影响。用冻结库副本同时验证首屏、全局计数、Reference 刷新并发和分页。
- 真实 Reference 提交可使在途读取失效。保留已加载的数据并提供首页重试。

## Migration Plan

sidecar 打开现有数据库时补齐修订号和触发器。验收使用迁移数据库的隔离副本。普通 XPI 仍由既有七平台 sidecar 指纹预检控制。
