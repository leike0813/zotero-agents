## TL;DR

本文提出 RT-DETRv2，一种改进的实时检测 Transformer。在 RT-DETR 基础上，本文引入一系列 bag-of-freebies 策略以提升灵活性与部署实用性，同时优化训练策略以在不损失速度的前提下提高检测精度。

核心改进包括：为可变形注意力模块的不同尺度特征设置差异化采样点数量、提出可选的离散采样算子替代 grid_sample 以消除部署约束、引入动态数据增强与尺度自适应超参数定制。实验表明 RT-DETRv2 在 COCO 数据集上各尺度模型均超越原版 RT-DETR，且推理速度保持不变。

## 研究问题与贡献

- 研究问题：如何在保持 DETR 端到端检测优势与实时推理速度的同时，进一步提升模型的灵活性、部署实用性及检测精度？

- 提出多尺度差异化采样点数量的可变形注意力机制，实现选择性多尺度特征提取

- 提出可选的离散采样算子替代 grid_sample，消除 DETR 系列模型的部署约束

- 提出动态数据增强策略，在训练早期施加强增强、末期减弱以适应目标域

- 提出尺度自适应超参数定制，针对不同规模模型调整 backbone 学习率

## 方法要点

- 在可变形注意力模块中为不同尺度特征设置不同的采样点数量，以利用各尺度特征的内在差异

- 离散采样算子通过对预测采样偏移进行四舍五入操作，省略耗时的双线性插值，训练时用 grid_sample 预训练后再用离散采样微调

- 动态数据增强在训练最后两个 epoch 关闭 RandomPhotometricDistort、RandomZoomOut、RandomIoUCrop 和 MultiScaleInput

- 尺度自适应超参数：小型模型（如 ResNet18）提高 backbone 学习率至 1e-4，大型模型（如 ResNet101）降低至 1e-6

## 关键结果

- RT-DETRv2-S（ResNet18）AP 从 46.5 提升至 47.9（+1.4），AP50 从 63.8 提升至 64.9（+1.1），FPS 保持 217

- RT-DETRv2-M（ResNet34）AP 从 48.9 提升至 49.9（+1.0），FPS 保持 161

- RT-DETRv2-L（ResNet50）AP 从 53.1 提升至 53.4（+0.3），FPS 保持 108

- 离散采样替换仅导致 AP50 下降 0.1-0.4，成功消除部署约束

- 减少采样点数量至原来的 1/4 时 AP 仅下降 0.6，对工业场景影响可控

## 局限与可复现性线索

- 本文为技术报告，实验仅在 COCO 数据集上进行验证，缺少跨数据集泛化评估

- 离散采样算子虽消除了部署约束，但仍会导致 AP 轻微下降（0.1-0.4）

- 源代码与预训练模型将开源（github.com/lyuwenyu/RT-DETR），但运行本文时未提供

## 分章节总结

### Abstract

- 概述 RT-DETRv2 作为 RT-DETR 改进版的定位

- 说明三大改进方向：灵活性（差异化采样点）、实用性（离散采样算子）、训练策略（动态增强与超参数定制）

### 1 Introduction

- 回顾 YOLO 系列在实时检测领域的主导地位及 RT-DETR 的突破性意义

- 指出 RT-DETR 的 hybrid encoder 与 uncertainty-minimal query selection 设计

- 引出 RT-DETRv2 的三个改进方向及其动机

### 2 Method

- 框架保持与 RT-DETR 一致，仅修改 decoder 中的可变形注意力模块

- 差异化采样点：不同尺度特征设置不同采样点数量，实现更灵活的特征提取

- 离散采样：用 discrete_sample 替代 grid_sample，通过四舍五入省略双线性插值以消除部署约束

### 2.2 Training Scheme

- 动态数据增强：训练早期施加强增强，最后两个 epoch 关闭部分增强策略

- 尺度自适应超参数：小型模型提高 backbone 学习率，大型模型降低学习率

### 3 Experiment

- 使用 ImageNet 预训练 ResNet 作为 backbone，AdamW 优化器，batch size 16，EMA decay 0.9999

- 离散采样采用 6x grid_sample 预训练 + 1x discrete_sample 微调策略

- RT-DETRv2 所有尺度均超越 RT-DETR 且速度不变

- 采样点消融表明减少至 1/4 时 AP 仅降 0.6

- 离散采样消融表明 AP50 下降 0.1-0.4，消除部署约束

### 4 Conclusion

- RT-DETRv2 为 RT-DETR 提供了改进基线，增加了灵活性与实用性

- 期望为 DETR 家族提供研究洞察并拓宽 RT-DETR 应用范围