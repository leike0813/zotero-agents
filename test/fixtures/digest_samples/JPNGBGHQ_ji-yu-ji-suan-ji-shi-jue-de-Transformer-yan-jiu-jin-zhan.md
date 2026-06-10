## TL;DR

本文系统综述了Transformer模型在计算机视觉领域的应用进展。Transformer凭借自注意力机制突破了CNN的感受野限制，能够建模长距离依赖关系，在图像分类、目标检测、图像分割、识别任务、图像增强、图像生成和视频处理七大视觉任务中展现出优越性能。

文章回顾了Transformer的基本原理（编码器-解码器架构、自注意力机制、多头注意力），重点分析了ViT、DETR、SETR等代表性模型在各视觉任务中的应用效果与改进思路。最后总结了Transformer在视觉领域面临的冗余性、效率、数据规模、可解释性等挑战，并展望了CNN与Transformer融合互补的未来发展方向。


## 研究问题与贡献

- 研究问题：Transformer如何在计算机视觉各任务中替代或补充CNN？其在视觉领域的应用现状、优势与局限是什么？


- 系统梳理Transformer基本原理及其迁移到视觉领域的技术脉络

- 按七大视觉任务分类整理代表性Transformer模型，分析其方法创新与实验效果

- 对比Transformer与CNN在各任务上的性能差异，总结Transformer的优势与不足

- 提出Transformer在视觉领域的五大未来研究方向：冗余性优化、通用模型构建、效率提升、数据规模扩展与可解释性研究


## 方法要点

- 编码器-解码器架构：6层编码器与解码器堆叠，配合残差连接与层正则化

- 缩放点积自注意力：通过Q/K/V线性变换计算全局依赖，避免RNN的顺序计算限制

- 多头注意力机制：将Q/K/V拆分到多个子空间并行计算，捕获不同角度的关联信息

- 图像块序列化（ViT）：将二维图像切分为patch并展平为序列，引入位置编码与分类token

- 集合预测框架（DETR）：将目标检测视为端到端集合预测问题，使用匈牙利算法二分匹配

- 嵌套Transformer架构（TNT）：内外双层Transformer分别建模像素级与图像块级特征

- 可变形注意力（Deformable DETR）：仅关注参考点周围关键采样点，降低计算复杂度


## 关键结果

- ViT-H/14在ImageNet上以88.55% Top-1准确率超越EfficientNet，打破CNN在分类任务的主导地位

- DETR在COCO数据集上AP达42%，速度与精度均优于Faster R-CNN，实现端到端检测

- Deformable DETR训练周期比DETR减少10倍，小目标检测提升5.9% APs

- SegFormer在ADE20K上以64M参数实现51.8% mIoU，比SETR参数减少4倍且精度提升1.6%

- TimeSformer在Kinetics-400上推理时间仅36分钟（SlowFast需14.88小时），支持超长时序建模

- T2T-ViT在ImageNet上达80.7% Top-1精度，超越同规模ResNet50且更加轻量化

- PoseFormer在Human3.6M上MPJPE降至44.3mm，比METRO降低约18%


## 局限与可复现性线索

- Transformer缺乏归纳偏置（平移不变性、局部敏感性），数据不足时泛化能力弱于CNN

- 无法高效处理高分辨率特征图，注意力计算复杂度随像素数平方增长

- 模型依赖大规模数据训练，ViT需300M+样本才能充分发挥性能优势

- 位置编码为人为引入，结构上顺序无关，存在固有的位置信息丢失问题

- 部分模型计算量巨大（ViT需180亿FLOPs达78%准确率，GhostNet仅6亿FLOPs达79%）

- 小目标检测性能仍待提升（DETR在COCO上APs仅20.5%）

- 未开源训练代码与预训练权重的可复现性信息不足


## 分章节总结

### 摘要与引言

- 指出CNN在计算机视觉中的主导地位及其局限性（缺乏全局理解、固定权重无法动态适应）

- 回顾Transformer由Google于2017年提出，2018年Image Transformer首次迁移到视觉领域

- 列举2020-2021年代表性工作：DETR（目标检测）、iGPT（无监督学习）、ViT（图像分类）、VQGAN（图像生成）

- 总结Transformer在视觉领域快速发展的三大原因：长距离依赖能力强、多模态融合能力强、模型更具可解释性



### 1 Transformer 基本原理

- 对比RNN的顺序计算缺陷（无法并行、长距离信息丢失），Transformer通过并行化与自注意力解决

- 编码器-解码器架构：6层堆叠，编码器含多头注意力与前馈连接，解码器额外增加遮掩多头注意力层

- 位置编码通过正弦/余弦函数引入序列位置信息，使模型能直接并行输入数据

- 缩放点积注意力通过Q/K/V矩阵计算全局依赖，除以缩放因子防止梯度消失

- 多头注意力将参数拆分到多个子空间并行计算，最后合并信息，捕获不同角度的关联



### 2.1 图像分类

- iGPT首次将Transformer直接用于图像分类，在CIFAR-10上达96.3%准确率，但参数量巨大（1362M）

- ViT将图像切块序列化，在ImageNet上打破CNN主导，但依赖大规模数据且忽略图像空间结构

- TNT通过内外双层Transformer分别建模像素与图像块关系，保持全局与局部特征

- T2T-ViT提出渐进式Token化机制，减少序列长度与计算量，在ImageNet上达80.7%精度

- Token Labeling技术通过软标签重新标注改善ViT性能，在ImageNet上达84.4%精度

- DeepViT引入再注意力机制解决深层ViT的注意力坍塌问题，使性能随层数加深而提升



### 2.2 目标检测

- DETR首次将Transformer用于目标检测，视为集合预测问题，端到端训练无需NMS与锚点设计

- DETR在小目标检测上表现较差（APs仅20.5%）且收敛慢，因注意力权重初始化均匀分布

- Deformable DETR融合可变形卷积与Transformer，训练周期减少10倍，小目标提升5.9% APs

- TSP提出纯编码器版本DETR，去除解码器交叉注意力模块，提高检测精度与收敛性

- UP-DETR通过无监督预训练（随机查询块检测）提升DETR性能，收敛速度更快

- ACT使用局部敏感哈希自适应聚类，将DETR计算量从73.4 GFLOPs降至58.2 GFLOPs



### 2.3 图像分割

- SETR将语义分割转为序列到序列预测任务，使用纯Transformer不做下采样，在ADE20K上mIoU达48.64%

- Segmenter在编码阶段采用ViT结构，解码阶段引入逐点线性或掩码Transformer解码器

- SegFormer结合分层Transformer与轻量MLP解码器，在ADE20K上以64M参数实现51.8% mIoU

- MaX-DeepLab采用双路径架构（CNN+全局内存），是首个端到端全景分割模型，COCO上达51.3% PQ

- VisTR将视频实例分割建模为端到端序列解码问题，在YouTube-VIS上比MaskTrack R-CNN提升3.8% AP



### 2.4 识别任务

- CVT首次将Transformer用于面部表情识别，设计注意选择性融合方法，在RAF-DB上正确率达88.14%

- PoseFormer设计时空Transformer用于3D人体姿态估计，在Human3.6M上MPJPE降至44.3mm

- TransReID首个纯Transformer用于对象重识别，设计SIE模块与JPM模块，在MSMT17上提升8.6% mAP

- LSTR采用多项式参数模型描述车道线，利用自注意力建模非局部交互，比Line-CNN快14倍



### 2.5 图像增强

- IPT预训练模型通过多头/多尾结构共享Transformer模块，支持超分辨率、降噪、去雨等多任务

- TTSR引入高分辨率参考图像指导超分辨率计算，通过注意力机制实现纹理特征准确迁移



### 2.6 图像生成

- Image Transformer迈出Transformer到图像生成第一步，采用自回归方式逐像素生成

- VQGAN结合CNN归纳偏置与Transformer表达能力，首个由语义引导生成百万像素图像的架构

- TransGAN构建纯Transformer架构的GAN，在STL-10上IS达10.10、FID达25.32，优于卷积GAN



### 2.7 视频处理

- MEGA设计记忆增强全局-局部整合网络用于视频目标检测，在ImageNetVID上mAP达84.1%

- STTN提出联合时空变换网络用于视频修复，在YouTube-VOS和DAVIS上多项指标显著提升

- TimeSformer首个无卷积视频架构，分割时间-空间注意力方案，推理时间远低于SlowFast

- ConvTransformer首次结合CNN与Transformer用于视频帧合成，在Vimeo90K上PSNR显著优于基线



### 3 应用展望

- Transformer缺乏归纳偏置，数据不足时泛化能力弱；无法处理高分辨率特征图；位置编码存在结构缺陷

- 提出CNN与Transformer应取长补短、相互融合，而非取代关系

- 五大未来方向：输入冗余性优化、通用模型构建、计算效率提升、数据规模扩展、可解释性研究



### 4 结语

- Transformer已成为计算机视觉研究热点，在七大视觉任务中展现出巨大潜力

- 本文分类分析了Transformer在各任务中的应用，总结了面临的挑战与未来发展趋势