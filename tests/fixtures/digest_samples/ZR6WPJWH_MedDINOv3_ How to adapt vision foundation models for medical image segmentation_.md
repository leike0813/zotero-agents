## TL;DR

本文提出 MedDINOv3，一种将 DINOv3 视觉基础模型适配到医学图像分割任务的有效框架。通过重新设计纯 ViT 架构（引入多尺度 token 聚合与高分辨率训练），并在 387 万张 CT 切片上进行域自适应预训练，MedDINOv3 在四个公开 CT/MRI 基准上匹配或超越了 nnU-Net 等强 CNN 基线。

研究系统分析了 DINOv3 三阶段预训练配方在医学域中的贡献：DINOv2 风格的自蒸馏（Stage 1）与高分辨率适配（Stage 3）显著提升特征迁移性，而 gram anchoring（Stage 2）在本设定中作用有限。结果表明，经过针对性架构改进和域对齐预训练的简单 ViT 架构可以缩小甚至超越专用 CNN 的性能差距。

## 研究问题与贡献

- 研究问题：如何将在大规模自然图像上预训练的视觉基础模型（如 DINOv3）有效迁移到医学图像分割任务中，克服 ViT 骨干网络在密集预测任务中落后于 CNN 以及自然图像与医学图像之间存在显著域差距这两大挑战？

- 提出了一种适用于 2D 医学分割的简化 ViT 架构，通过中间层 patch token 的多尺度 token 聚合和高分辨率训练，将 ViT-B 在 AMOS22 上的 DSC 从 78.39% 提升至 85.51%。

- 构建了 CT-3M 数据集（包含 16 个公开数据集、共 387 万张轴位 CT 切片），并采用三阶段 DINOv3 配方进行域自适应预训练，系统量化了每个阶段对下游分割性能的贡献。

- 在 AMOS22、BTCV、KiTS23、LiTS 四个公开基准上取得 SOTA 结果：OAR 分割超越 nnU-Net（AMOS22 +2.57% DSC，BTCV +5.49% DSC），肿瘤分割与 nnU-Net 持平。

## 方法要点

- 多尺度 token 聚合：复用中间 transformer 块（blocks 2, 5, 8, 11）的 patch token 并拼接输入解码器，为 ViT 补充空间先验，在 AMOS22 上提升 2.10% DSC。

- 高分辨率训练：将输入分辨率从 640×640 提升至 896×896（保持 0.45mm 层间距），在 AMOS22 上提升 2.06% DSC。

- 三阶段域自适应预训练：Stage 1 使用 DINOv2 损失（DINO + iBOT + KOLEO）进行自蒸馏；Stage 2 引入 gram anchoring 稳定 patch 级一致性；Stage 3 进行高分辨率适配。

- 发现 gram anchoring 在 CT-3M 预训练中是可选的——Stage 1 期间 patch token 质量未出现明显退化，因此 Stage 2 的额外收益有限。

## 关键结果

- AMOS22（腹部器官分割）：MedDINOv3 达到 87.38% DSC，超越 nnU-Net（84.81%）2.57 个百分点。

- BTCV（腹部 13 器官分割）：MedDINOv3 达到 78.79% DSC，超越 nnU-Net（73.30%）5.49 个百分点。

- KiTS23（肾脏肿瘤分割）：MedDINOv3 达到 70.68% DSC，与 nnU-Net（69.15%）持平。

- LiTS（肝脏肿瘤分割）：MedDINOv3 达到 75.28% DSC，与 nnU-Net（75.00%）持平。

- 消融实验验证了各架构改进的独立贡献：DINOv3 预初始化 +2.96%，多尺度 token 聚合 +2.10%，高分辨率训练 +2.06%。

- 域自适应预训练 Stage 1 提升 1.07% DSC，Stage 3 高分辨率适配额外提升 0.84% DSC。

## 局限与可复现性线索

- 实验仅使用默认五折交叉验证中的单折（80/20 分割），因计算成本限制，结果可能不够充分。

- 模型仅针对 2D 分割设计，未涉及 3D 体积分割场景。

- 代码已开源：https://github.com/ricklisz/MedDINOv3。

- 预训练数据 CT-3M 全部来自公开数据集，无私有数据。

## 分章节总结

### 1 Introduction

- 医学图像（CT/MRI）分割对诊断与治疗规划至关重要，但现有深度学习模型多为任务专用，跨模态和跨机构的泛化能力有限。

- 视觉基础模型（如 DINOv2/v3）在自然图像上展现了强大的表征能力，但直接迁移到医学域面临 ViT 骨干在密集预测上落后于 CNN 以及域差距两大挑战。

- 本文提出 MedDINOv3，通过架构改进（多尺度 token 聚合、高分辨率训练）和 CT-3M 域自适应预训练来适配 DINOv3。

### 2 Related Work

- 医学视觉基础模型方向：Models Genesis、SwinUNETR-SSL、MIM 预训练等方法已证明自监督学习在医学图像中的价值；DINOv2 自然图像特征可迁移到放射学分类但分割性能落后。

- ViT 在医学分割中的应用：TransUNet、UNETR、SwinUNETR 等将 transformer 引入分割架构，但近期基准研究表明 CNN（如 nnU-Net）仍是强基线；Primus 等最新工作通过简化架构逼近 CNN 性能。

### 3 Method

- 架构改进逐步验证：DINOv3 预初始化 ViT-B + Primus 解码器作为基线；多尺度 token 聚合（中间 blocks 2,5,8,11）；高分辨率训练（896×896）。

- CT-3M 数据集构建：聚合 16 个公开 CT 数据集共 387 万张轴位切片，覆盖腹部、胸部、盆腔 100+ 结构。

- 三阶段预训练：Stage 1（DINO+iBOT+KOLEO 自蒸馏）、Stage 2（gram anchoring 稳定 patch 一致性）、Stage 3（高分辨率适配）。

### 4 Results

- 四个基准对比：MedDINOv3 在 AMOS22 和 BTCV 上显著超越 nnU-Net，在 KiTS23 和 LiTS 上与 nnU-Net 持平；SegFormer 和 DINO U-Net 表现均不如 nnU-Net。

- 消融实验：Stage 1 预训练提升 1.07% DSC；gram anchoring 收益有限（patch token 在 Stage 1 中未明显退化）；Stage 3 高分辨率适配额外提升 0.84% DSC。

- 高分辨率特征可视化显示 MedDINOv3 在更高输入分辨率下产生更平滑、更一致的特征图。

### 5 Conclusion

- MedDINOv3 证明：经过针对性架构改进和域自适应预训练的简单 ViT 架构可以缩小甚至超越专用 CNN 在医学分割中的性能。

- DINOv2 风格自蒸馏和高分辨率适配是域迁移的关键驱动因素，gram anchoring 在本设定中作用有限。