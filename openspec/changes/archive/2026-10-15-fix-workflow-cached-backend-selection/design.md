# Design

## Context

本记录补录已实现的修复，动机与范围见 `proposal.md`。修复前源码基线为 `8d2cf77c7c8e6f617f56ee994123d9e2ce1b3360`；交互参照是 main 上 v0.8.4 的 commit `fe273f37f2093c4a34be15f93e7d46a3b3484791`。用户已确认的默认选择、记忆期限和手动刷新规则作为验收依据，不能以旧修复的规格反推用户意图。

根因证据：

- `148ac3512` 的 `WorkflowFieldRow` 为 `allowUnset` 注入空值项，并把 `observedValue` 拼成带默认后缀的标签，将显示默认值变成独立选项。
- `acpFormCatalogPreparation.prepare` 把缺少 model/mode reasoning 记录视为需要探测；两处宿主在打开表单或切换选项时调用它，并用 reasoning ready 状态阻止保存或提交。
- backend 切换只清除旧专属值，没有当前表单内的 backend 选择记忆。回声到达前的后续完整草稿仍可能携带旧模型，覆盖宿主已选定的新模型。
- 提交窗口保留本地 provider options 时可能恢复宿主已删除的 reasoning；无选项的禁用文本控件也会在确认时把空串写回草稿。
- 在现有测试中，缓存切换探测计数、backend 往返恢复、无 current 的默认显示、provider 切换后继续修改超时再确认均曾失败，随后修复转绿。验证命令和边界见 `verification.md`。

## Goals / Non-Goals

**Goals:** 两处表单共用设置和草稿衔接规则；默认显示与显式覆盖分离；backend 记忆绑定 workflow 和当前表单；缓存读取与手动刷新分离。

**Non-Goals:** 不恢复 v0.8.4 的模型后缀折叠，不改变实时 ACP setter 或持久化格式，不新增跨表单或跨重启记忆，不扩展到其它运行面板。

## Decisions

### 默认值由目录投影，显式选择由用户操作产生

复用 schema 的 `allowUnset` / `observedValue` 显示真实 current 或目录首项，挂载与确认不将其写成覆盖。共享下拉仅对这些字段允许同值点击回调，使用户能主动固定当前显示项；禁用控件不参与确认时的值写回。取消独立默认项，避免同一模型有两种可选身份。

### backend 专属值只在表单 owner 中记忆

复用 schema `retention` 清理跨 backend 字段。两处宿主各自持有当前表单的选择表，Dashboard 按 workflow 隔离；登记来源使用宿主权威草稿，防止快速切换的旧 payload 污染记忆。恢复前以目标目录校验，通用参数继续保留。采用内存记忆而非新持久化字段，符合已确认的生命周期。

### 模型目录读取不依赖 reasoning 准备

backend 缓存保留全部模型提供商目录，切换 provider 在本地筛选并选首项。reasoning 按 raw model、有效 mode、配置 fingerprint 和目录 revision 解析；缺少对应记录只禁用该字段，年龄与 stale 标志只提示手动刷新。手动刷新保留串行、取消、60 秒预算和迟到结果隔离，并读取完整 backend 目录，不以当前选择改写缓存默认值。实时执行仍以 session metadata 校验显式选项。

### 未回声选项使用共用的 source/rebased 衔接

共享设置层比较宿主收到的完整草稿与已应用的重选结果：后续 payload 仍带旧值时补入重选结果；本次正在修改的字段及不同的新值优先。两处宿主复用该逻辑，替代提交窗口分别追踪 backend 和 provider 模型的修补分支。组件按已发布选项合并新回声与在途输入，接受宿主字段删除，保留随后输入的超时等值。

## Risks / Trade-offs

- 旧缓存可能与实时后端不同 → 表单提示手动刷新，真正执行继续按实时目录拒绝无效显式选项。
- 显示值不等于运行覆盖 → 通过未手选不发覆盖、同值点击形成覆盖的测试锁定区别。
- 快速切换和输入可能跨越回声 → 测试覆盖乱序描述器、立即确认、切换后继续修改超时、backend 往返和无效 reasoning 不复活。
- 尚无构建或实机证据 → `verification.md` 明确记录该验收边界，不将自动测试视作真实 Zotero 验收。

## Migration Plan

主规格已在修复中更新；本 change 的 delta 保留此次相对修复前基线的完整 requirement 变更，包括手动刷新 requirement 的重命名。补录时不再次同步或归档，也不重复执行源码变更。

现有配置继续按原格式读取；普通打开或刷新仍保留失效显式值供校验，只有切回 backend 的记忆恢复路径丢弃失效记录。后续如需回滚，应将本修复的源码、主规格和文档作为同一变更审阅处理。
