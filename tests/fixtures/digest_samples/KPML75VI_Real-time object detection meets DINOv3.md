## TL;DR

本文提出 DEIMv2，一种基于 DINOv3 特征的实时目标检测器。DEIMv2 提供从 X 到 Atto 共八种模型尺寸，覆盖 GPU、边缘和移动设备部署。

对于 X、L、M、S 变体，采用 DINOv3 预训练/蒸馏骨干网络，并引入空间调优适配器（STA），将 DINOv3 的单尺度输出高效转换为多尺度特征。对于超轻量级模型（Nano、Pico、Femto、Atto），采用剪枝后的 HGNetv2 骨干。

实验表明，DEIMv2-X 以仅 50.3M 参数实现 57.8 AP，超越 prior X-scale 模型。DEIMv2-S 成为首个突破 50 AP 的 sub-10M 模型（9.71M 参数，50.9 AP）。DEIMv2-Pico 以 1.5M 参数达到 38.5 AP，与 YOLOv10-Nano（2.3M）相当但参数减少约 50%。

## 研究问题与贡献

- 研究问题：如何在实时目标检测中有效利用 DINOv3 的强大特征表示，同时覆盖从高性能到超轻量级的广泛部署场景？

- 提出 DEIMv2，提供八种模型尺寸，覆盖 GPU、边缘和移动设备部署

- 对于较大模型，利用 DINOv3 获取强语义特征，并引入 STA 高效集成到实时检测

- 对于超轻量级模型，基于 HGNetv2-B0 剪枝深度和宽度，满足严格计算约束

- 简化 decoder 并升级 Dense O2O，引入物体级 Copy-Blend 增强

- 在 COCO 上证明 DEIMv2 在所有资源设置下超越现有 SOTA 方法

## 方法要点

- 空间调优适配器（STA）：将 DINOv3 的单尺度（1/16）输出通过双线性插值转换为多尺度特征，并补充细粒度细节

- ViT 骨干变体：L/X 使用 DINOv3 预训练的 ViT-Small/Small+，S/M 使用从 DINOv3 蒸馏的 ViT-Tiny/Tiny+

- HGNetv2 变体：Nano/Pico/Femto/Atto 通过逐步剪枝 HGNetv2-B0 的深度和宽度实现超轻量设计

- 高效 Decoder：采用 SwiGLUFFN、RMSNorm，跨层共享查询位置嵌入

- 增强的 Dense O2O：引入物体级 Copy-Blend 增强，增加有效监督

## 关键结果

- DEIMv2-X：57.8 AP，50.3M 参数，151.6 GFLOPs，超越 DEIM-X（56.5 AP，62M 参数）

- DEIMv2-S：50.9 AP，9.71M 参数，25.62 GFLOPs，首个 sub-10M 突破 50 AP 的模型

- DEIMv2-Pico：38.5 AP，1.51M 参数，5.15 GFLOPs，与 YOLOv10-Nano（2.3M）相当

- DEIMv2-Atto：23.8 AP，0.49M 参数，0.76 GFLOPs，与 NanoDet-M 相当但尺寸更小

- DINOv3 特征主要提升中大物体检测性能，小物体检测仍是挑战

## 局限与可复现性线索

- DINOv3 特征在捕捉强全局语义方面表现出色，但表示细粒度细节能力有限，小物体检测性能提升不明显

- 论文提供了项目主页和 GitHub 代码仓库链接

- 延迟测试未进行专门优化，Flash Attention 等技术可能进一步加速推理

- 超轻量级模型（Pico、Femto、Atto）因能力有限，未使用 FGL 和 DDF 损失组件

## 分章节总结

### Abstract

- DEIMv2 基于 DEIM 的 Dense O2O，扩展 DINOv3 特征

- 八种模型尺寸从 X 到 Atto，覆盖 GPU、边缘、移动部署

- X/L/M/S 采用 DINOv3 骨干 + STA，超轻量级采用剪枝 HGNetv2

- DEIMv2-X 以 50.3M 参数实现 57.8 AP，超越 prior X-scale 模型

- DEIMv2-S 以 9.71M 参数达到 50.9 AP，首个 sub-10M 突破 50 AP

- DEIMv2-Pico 以 1.5M 参数达到 38.5 AP，与 YOLOv10-Nano（2.3M）相当

### 1. Introduction

- 实时目标检测在自动驾驶、机器人、工业缺陷检测中至关重要

- DETR-based 方法因端到端特性受青睐，但 DINOv3 集成到 DETR 的可行性尚未充分研究

- DEIMv2 基于 DEIM 管道，增强 DINOv3 特征，提供八种变体

- STA 将 DINOv3 单尺度输出转换为多尺度特征，补充细粒度细节

- Decoder 简化：采用 SwishFFN、RMSNorm，共享查询位置嵌入

- Dense O2O 增强：引入物体级 Copy-Blend 增强

- DEIMv2-X 实现 57.6 AP（50.3M 参数），DEIMv2-S 实现 50.9 AP（

- 整体架构遵循 RT-DETR：骨干 + 混合编码器 + 解码器

- ViT 变体：L/X 用 DINOv3 ViT-Small/S+，S/M 用蒸馏 ViT-Tiny/T+

- HGNetv2 变体：Pico 移除第 4 阶段，Femto 减少块数，Atto 缩减通道

- STA：全卷积网络，双线性插值生成多尺度，Bi-Fusion 增强特征

- 高效 Decoder：SwiGLUFFN、RMSNorm、跨层共享位置嵌入

- 增强 Dense O2O：物体级 Copy-Blend 增强，不同于 Copy-Paste 的完全覆盖

- 损失函数：MAL + FGL + DDF + BBox Loss + GIoU，超轻量级不使用 FGL/DDF

### 3. Experiments

- DEIMv2-X：57.8 AP，50M 参数，151 GFLOPs，超越 DEIM-X（56.5 AP，62M 参数）

- DEIMv2-S：50.9 AP，10M 参数，26 GFLOPs，超越 DEIM-S（49.0 AP，10M 参数）

- ViT 骨干参数量和 FLOPs 更低，可扩展性和部署灵活性更好

- DINOv3 变体相比前代主要提升中大物体（AP_M/AP_L），小物体（AP_S）改善有限

- DEIMv2-Atto（0.49M）与 NanoDet-M 相当，DEIMv2-Pico（1.5M）与 YOLOv10-N（2.3M）相当

- 延迟未优化，Flash Attention 可进一步加速

### 4. Conclusion

- DEIMv2 结合 DINOv3 语义特征与轻量 STA，实现 SOTA 性能

- 高端：DEIMv2-X 以更少参数实现 57.8 AP

- 紧凑端：DEIMv2-S 首个 sub-10M 突破 50 AP，Pico 以 50% 更少参数匹配 YOLOv10-N

- DEIMv2 高效且可扩展，适用于从边缘设备到高性能系统的多样化场景