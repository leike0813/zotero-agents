## TL;DR

本文提出 Vision Transformer（ViT），证明纯 Transformer 架构直接应用于图像块序列即可在图像分类任务上取得优异表现，无需依赖卷积神经网络。

在大规模数据集（14M-300M 图像）上预训练后，ViT 在 ImageNet（88.55%）、CIFAR-100（94.55%）、VTAB（77.63%）等多个基准上达到或超越当时最优 CNN 模型，且预训练所需计算资源显著更少。核心发现是：大规模训练可以弥补 Transformer 在视觉任务中缺乏的归纳偏置。


## 研究问题与贡献

- 研究问题：能否在不引入图像特定归纳偏置的前提下，将标准 Transformer 直接应用于图像识别，并在大规模训练下与最优 CNN 竞争？


- 提出 Vision Transformer（ViT），将图像切分为固定大小块并作为序列输入标准 Transformer 编码器

- 证明大规模预训练（14M-300M 图像）可以弥补 Transformer 缺乏视觉归纳偏置的不足

- 在 ImageNet、CIFAR-100、VTAB 等多个基准上达到或超越最优 CNN，且训练计算成本更低

- 系统分析了 ViT 的归纳偏置、位置编码学习模式和内部注意力机制


## 方法要点

- 将 H×W 图像切分为 N 个 P×P 块，经可学习线性投影得到 D 维块嵌入

- 在块序列前添加可学习分类标记 [class]，其最终状态作为图像表征

- 添加可学习一维位置编码以保留空间信息

- Transformer 编码器由交替的多头自注意力（MSA）和 MLP 层组成，每层前使用 LayerNorm 和残差连接

- 支持混合架构：CNN 特征图作为 Transformer 输入

- 微调时通过二维插值调整位置编码以适配更高分辨率图像


## 关键结果

- ViT-H/14（JFT-300M 预训练）：ImageNet 88.55%、ImageNet-ReaL 90.72%、CIFAR-100 94.55%、VTAB 77.63%

- ViT 训练计算成本显著低于 BiT-L（ResNet152x4）：2.5k TPUv3-core-days vs 9.9k

- 在小数据集上 ViT 不如 ResNet（缺乏归纳偏置），但在 JFT-300M 上全面超越

- ViT 在性能/计算权衡上优于 ResNet，仅需约 1/2-1/4 计算量达到同等性能

- 混合架构在小模型时略有优势，大模型时与纯 ViT 差距消失


## 局限与可复现性线索

- 小规模数据集上表现不如 CNN，强依赖大规模预训练数据

- 自监督预训练（掩码块预测）初步探索仅提升 2%，与监督预训练差距仍大（4%）

- 仅评估图像分类任务，未扩展到检测和分割等任务

- 论文提及代码和模型将开源，但未在正文中提供完整复现细节


## 分章节总结

### ABSTRACT

- Transformer 在 NLP 中已成为标准，但在计算机视觉中仍受限

- 现有视觉 Transformer 方案仍依赖 CNN，本文证明这种依赖不必要

- ViT 在大规模预训练下迁移到多个基准表现优异，且训练资源更少



### 1 INTRODUCTION

- NLP 中 Transformer 预训练-微调范式已取得巨大成功（BERT、GPT 等）

- 视觉领域仍以 CNN 为主流，结合自注意力的方案尚未有效扩展

- 本文将图像切分为块序列输入标准 Transformer，最简化修改

- 小数据集上 ViT 略逊于 ResNet（缺乏平移等变性和局部性归纳偏置）

- 大规模训练（14M-300M 图像）可弥补归纳偏置的缺失

- ViT 在 ImageNet-21k 或 JFT-300M 预训练后迁移到多个基准达到或超越 SOTA



### 2 RELATED WORK

- Transformer 从机器翻译扩展至 NLP 各任务，大模型预训练-微调成为主流

- 自注意力直接应用于图像的二次方成本问题，已有局部注意力、稀疏注意力等近似方案

- Cordonnier 等（2020）提取 2×2 块应用自注意力，但未展示大规模预训练效果

- CNN + 自注意力结合方向：特征图增强、目标检测、视频处理等

- iGPT 降低分辨率和色彩空间后应用 Transformer，但以生成方式无监督训练

- 大规模图像识别趋势：使用 ImageNet-21k、JFT-300M 等额外数据源



### 3 METHOD

- ViT 架构：图像切块 → 线性嵌入 → 添加位置编码和分类标记 → Transformer 编码器

- 公式化描述：块嵌入投影、MSA+LN+残差、MLP+LN+残差、分类头

- 归纳偏置分析：ViT 仅在 MLP 层有局部性和平移等变性，自注意力层为全局操作

- 混合架构：CNN 特征图作为 Transformer 输入，块大小可为 1×1

- 微调与高分辨率：移除预训练头、附加零初始化分类层、2D 插值位置编码



### 4.1 SETUP

- 数据集：ImageNet（1.3M）、ImageNet-21k（14M）、JFT-300M（3.03 亿）

- 迁移任务：ImageNet、CIFAR-10/100、Pets、Flowers、VTAB 19 任务

- 模型变体：ViT-Base（86M）、Large（307M）、Huge（632M），配置仿照 BERT

- 基线 CNN：ResNet (BiT) 使用 GroupNorm 和标准化卷积

- 训练：Adam（batch 4096，weight decay 0.1），微调使用 SGD（batch 512）

- 评估指标：微调准确率和少量样本（few-shot）准确率



### 4.2 COMPARISON TO STATE OF THE ART

- ViT-L/16（JFT-300M）在所有任务上超越 BiT-L，计算量仅为 0.68k vs 9.9k TPUv3-core-days

- ViT-H/14 进一步提升 ImageNet、CIFAR-100、VTAB 等挑战性任务表现

- ViT-L/16（ImageNet-21k）在多数数据集上也表现良好，仅需 0.23k TPUv3-core-days

- VTAB 分解分析：ViT-H/14 在 Natural 和 Structured 任务组领先



### 4.3 PRE-TRAINING DATA REQUIREMENTS

- 小数据集（ImageNet）上大型 ViT 模型表现不如小型模型，即使加入正则化

- ImageNet-21k 上不同规模模型表现接近

- 仅 JFT-300M 上才能充分发挥大型模型潜力

- few-shot 评估显示：ResNet 在小数据集上更好但更早饱和，ViT 在大数据集上更优

- 卷积归纳偏置对小数据集有用，大数据集上直接从数据学习更有效



### 4.4 SCALING STUDY

- ViT 在性能/计算权衡上全面优于 ResNet，约少 2-4 倍计算量达到同等性能

- 混合架构在小计算预算下略有优势，大模型时差距消失

- ViT 在测试范围内未出现饱和趋势，未来扩展空间大



### 4.5 INSPECTING VISION TRANSFORMER

- 线性嵌入滤波器的主成分呈现块内精细结构的基函数

- 位置编码学习到了图像中 2D 拓扑关系：相邻块更相似，同行列块相似

- 自注意力距离随网络深度增加，底层已有部分头关注全局

- 模型在分类相关的语义区域上集中注意力



### 4.6 SELF-SUPERVISION

- 探索掩码块预测自监督预训练（类 BERT MLM），50% 块损坏率

- ViT-B/16 在 ImageNet 上达到 79.9%，较从头训练提升 2%

- 与监督预训练仍有 4% 差距，对比学习预训练留待未来工作



### 5 CONCLUSION

- 纯 Transformer 直接应用于图像块序列的简单策略在大规模预训练下表现优异

- ViT 在多个图像分类基准上匹配或超越 SOTA，且预训练成本相对较低

- 未来挑战：扩展到检测和分割任务、探索自监督预训练方法、进一步扩展规模