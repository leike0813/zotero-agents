# DAB-DETR: dynamic anchor boxes are better queries for DETR (2022)

- Paper ref: 1:IY3FMWQM
- Title: DAB-DETR: dynamic anchor boxes are better queries for DETR
- Year: 2022

## Filtered Digest

#### TL;DR

本文提出DAB-DETR（Dynamic Anchor Boxes DETR），一种将4D锚框坐标(x,y,w,h)直接作为DETR查询的新公式。该方法通过逐层动态更新锚框，并利用锚框尺寸调制交叉注意力中的位置先验，解决了DETR训练收敛慢的问题。

在MS-COCO基准测试中，DAB-DETR使用ResNet-50-DC5骨干网络训练50个epoch即可达到45.7% AP，在同类DETR架构中取得最优性能。该方法还可直接与Deformable DETR结合，进一步提升0.5 AP。


#### 研究问题与贡献

- 研究问题：如何重新设计DETR中的查询公式，以引入更好的空间位置先验并加速训练收敛？


- 提出将4D锚框坐标直接作为DETR查询的新公式，揭示查询本质上是框坐标

- 利用锚框的宽高信息调制交叉注意力图，使其自适应不同尺度的目标

- 引入温度参数调节位置注意力的平坦度，优化位置先验

- 实现逐层动态锚框更新，使查询以级联方式执行软ROI池化

- 在COCO数据集上取得同类DETR模型最优性能，且可直接迁移至Deformable DETR


#### 方法要点

- 将锚框(x,y,w,h)通过位置编码和MLP映射为位置查询向量

- 内容查询由解码器自注意力输出生成，与位置查询分离

- 锚框坐标逐层通过FFN预测的残差进行动态更新

- 在交叉注意力权重计算中，将宽高分别除到x和y部分的注意力分数上，实现尺寸调制的高斯核

- 引入温度参数T控制位置注意力的集中程度，实验表明T=20时性能最佳

- 固定首层x,y坐标为随机初始化值可防止过拟合，带来一致的性能提升


#### 关键结果

- ResNet-50-DC5骨干网络训练50 epoch达到45.7% AP，超越所有同类DETR模型

- ResNet-101-DC5骨干网络训练50 epoch达到46.6% AP

- DAB-Deformable-DETR在相同设置下将Deformable DETR从46.3 AP提升至46.8 AP

- 尺寸调制注意力相比固定高斯先验能更好地适应不同尺度目标

- 固定首层x,y坐标可使各配置下AP提升0.1-0.7个百分点

- 解码器层数从2层增加到6层时，AP从40.2提升至45.7
