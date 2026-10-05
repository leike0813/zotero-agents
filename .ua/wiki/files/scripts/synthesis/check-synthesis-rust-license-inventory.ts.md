
# scripts/synthesis/check-synthesis-rust-license-inventory.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-rust-license-inventory.ts -->

治理校验脚本，读取 Synthesis 侧车的 Cargo.lock 并核对每个 crate 的许可证是否登记在允许清单中。
源码：[scripts/synthesis/check-synthesis-rust-license-inventory.ts](../../../../../scripts/synthesis/check-synthesis-rust-license-inventory.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/check-synthesis-rust-license-inventory.ts:checkSynthesisRustLicenseInventory -->
<!-- node: function:scripts/synthesis/check-synthesis-rust-license-inventory.ts:lockPackages -->
<!-- node: function:scripts/synthesis/check-synthesis-rust-license-inventory.ts:packageKey -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisRustLicenseInventory | 函数 | 45–151 | 复杂 | script、tooling、build-system | 0 | 巡检主体函数：解析 Cargo.lock 的包与许可证集合，与允许清单比对后返回违规项。 |
| lockPackages | 函数 | 31–43 | 简单 | script、tooling、build-system | 0 | 从 Cargo.lock 文本中解析出 package 名称与版本条目。 |
| packageKey | 函数 | 27–29 | 简单 | script、tooling、build-system | 0 | 生成 package 的比较键（名称加版本），用于许可证清单匹配。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisRustLicenseInventory | 函数 | 45–151 | 巡检主体函数：解析 Cargo.lock 的包与许可证集合，与允许清单比对后返回违规项。 |
