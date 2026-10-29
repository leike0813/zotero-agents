# Proposal

## Why

批量迁移决策对较大的 Citation 重新套用 canonical 写入上限，并在校验失败前修改问题状态，导致报错后的重试跳过失败项。现有页面也缺少决策后果和选择来源的解释，升级用户难以发现迁移入口。

## What Changes

- 单项和批量决策先计算与校验，再原子发布；跳过损坏条目无需校验其待写 artifact。
- 按问题组织迁移向导，突出批量决策、逐项例外、决策来源、受影响条目与最终确认。
- 首次启用和插件升级后自动只读扫描个人库，显示进度，并提供打开迁移或稍后处理的提醒。
- 扫描和决策计算协作让出 UI；有界 DTO 和 receipt 保留决策摘要。

## Capabilities

### New Capabilities

- `literature-migration-onboarding`: 个人库升级检查、进度提示、版本标记和可操作提醒。

### Modified Capabilities

- `literature-artifact-migration`: 原子决策、问题向导、选择来源、最终确认、协作执行及启动只读检查入口。

## Impact

修改迁移 service/converter、Dashboard projection/Preact 区域、启动生命周期和首选项，扩展现有 receipt 与相关测试。保留 Broker 宿主读取、个人库范围、canonical 写入上限及现有远程接口；不迁移计算到 Rust，不引入依赖。
