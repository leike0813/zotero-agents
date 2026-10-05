
# rebuildSynthesisSidecarTransferSnapshot
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferSnapshot -->

重建传输顶层快照，收敛 manifest、状态与输出引用。
类型：函数  
复杂度：简单  
入边数：2  
标签：contract、rebuild、transfer  
所属文件：[packages/synthesis-contracts/src/sidecarTransfer.ts](../../../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md)
源码：[packages/synthesis-contracts/src/sidecarTransfer.ts:1510](../../../../../../../packages/synthesis-contracts/src/sidecarTransfer.ts#L1510)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisSidecarHandshakeResult](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:1188–1254 | 重建 sidecar 握手结果，校验协议版本与能力匹配。 |
| [rebuildSynthesisSidecarHealth](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:1135–1186 | 重建 sidecar 健康结果，区分存活、就绪与不可用及稳定原因码。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [toSynthesisJsonObject](../common.ts/toSynthesisJsonObject.md) | packages/synthesis-contracts/src/common.ts:144–161 | 在 toSynthesisJsonValue 之上要求结果必须是普通对象，否则以字段定位路径报错。 |
