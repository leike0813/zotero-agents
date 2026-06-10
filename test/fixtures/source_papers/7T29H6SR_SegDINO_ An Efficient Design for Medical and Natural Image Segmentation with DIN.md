# SEGDINO: AN EFFICIENT DESIGN FOR MEDICAL ANDNATURAL IMAGE SEGMENTATION WITH DINO-V3

Sicheng Yang1, Hongqiu Wang1, Zhaohu Xing1, Sixiang Chen1, Lei Zhu1,2 1The Hong Kong University of Science and Technology (Guangzhou), China 2The Hong Kong University of Science and Technology, China

## ABSTRACT

The DINO family of self-supervised vision models has shown remarkable transferability, yet effectively adapting their representations for segmentation remains challenging. Existing approaches often rely on heavy decoders with multi-scale fusion or complex upsampling, which introduce substantial parameter overhead and computational cost. In this work, we propose SegDINO, an efficient segmentation framework that couples a frozen DINOv3 backbone with a lightweight decoder. SegDINO extracts multi-level features from the pretrained encoder, aligns them to a common resolution and channel width, and utilizes a lightweight MLP head to directly predict segmentation masks. This design minimizes trainable parameters while preserving the representational power of foundation features. Extensive experiments across six benchmarks, including three medical datasets (TN3K, Kvasir-SEG, ISIC) and three natural image datasets (MSD, VMD-D, ViSha), demonstrate that SegDINO consistently achieves state-of-theart performance compared to existing methods. Code is available at https: //github.com/script-Yang/SegDINO.

## 1 INTRODUCTION

Image segmentation plays a central role in image analysis, serving as the foundation for downstream tasks such as object recognition (Minaee et al., 2021), scene understanding (Jain et al., 2023; Wang et al., 2024b), and computer-aided diagnosis (Azad et al., 2024; Wang et al., 2024a; 2025a). Despite remarkable progress achieved by convolutional networks (Long et al., 2015; Ronneberger et al., 2015), transformer-based models (Strudel et al., 2021; Li et al., 2024), diffusion-based architectures (Amit et al., 2021; Wu et al., 2024), and Mamba-based frameworks (Ma et al., 2024; Xing et al., 2024), these approaches often struggle to achieve strong generalization when training data are limited (Zhang et al., 2021). Recent SAM-based segmentation models (Kirillov et al., 2023; Mazurowski et al., 2023) offer powerful zero-shot capabilities but typically require extensive finetuning for downstream tasks, leading to inefficiency (Zhang et al., 2024). Moreover, even in the frozen setting, the computational overhead of SAM models is substantial, making them less suitable for lightweight or resource-constrained applications (Zhao et al., 2023). Consequently, the design of high-performance yet efficient segmentation frameworks remains an open challenge.

With the emergence of self-supervised foundation models (Caron et al., 2021; He et al., 2022), pretrained vision backbones have become increasingly prevalent for dense prediction. Rather than training encoders from scratch, recent segmentation methods leverage large-scale pretrained representations to capture rich semantics and structural priors (Zhou et al., 2024b). In contrast to SAMbased models, self-supervised vision models achieve a favorable balance by maintaining relatively modest parameter counts while extracting high-quality semantic features (Simeoni et al., 2025), ´ making them especially appealing for segmentation tasks.

Among various self-supervised foundation models, the DINO family has demonstrated exceptional transferability across a wide range of visual tasks (Wang et al., 2025c; Gao et al., 2025). DINO (Caron et al., 2021) and DINOv2 (Oquab et al., 2023) have been widely adopted for representation learning (Zhu et al., 2024; Wang et al., 2025b), providing robust multi-scale features suitable for detection (Damm et al., 2025) and segmentation (Ayzenberg et al., 2024). Most recently, DINOv3 (Simeoni et al., 2025) introduced significant improvements in pretraining strategies ´ and architectural refinements, achieving stronger invariance and scalability, and establishing itself as a state-of-the-art pretrained backbone.

However, effectively adapting DINO-based representations for segmentation tasks still remains a non-trivial challenge. Existing methods often employ relatively heavy decoders, such as multiscale fusion modules (Gao et al., 2025) or complex upsampling pipelines (Yang et al., 2025), which introduce substantial parameter overhead and computational cost. Such decoder complexity consequently offsets the efficiency advantages of frozen pretrained encoders and poses obstacles to deployment in resource-constrained settings (Xie et al., 2021).

To address these limitations, we propose SegDINO, a segmentation framework that couples a frozen DINOv3 backbone with a lightweight decoder. SegDINO leverages the DINO backbone to extract semantically rich features and employs a light MLP-based head to directly predict segmentation masks. This design minimizes the trainable parameter burden while preserving representational power from the foundation encoder. Extensive experiments on both medical and natural image segmentation benchmarks demonstrate that SegDINO achieves competitive or superior accuracy compared to baselines while offering significant efficiency advantages.

## 2 METHODOLOGY

## 2.1 OVERVIEW

As illustrated in Fig. 2, an input image is fed to a pretrained, frozen DINOv3 model to extract multi-layer features. The selected features are lightly upsampled to a common spatial resolution, concatenated along the channel dimension, and passed to a lightweight decoder to produce the final segmentation mask. During training, only the decoder is updated.

## 2.2 ENCODER BACKBONE

We adopt a pretrained DINOv3 Vision Transformer (Simeoni et al., 2025) as the encoder and freeze ´ all its parameters throughout training. Given an input image $\mathbf { x } \in \mathbb { R } ^ { H \times W \times 3 }$ and a patch size $p ,$ the encoder divides x into $\mathbf { \bar { \Sigma } } N = \mathbf { \Sigma } ( H / p ) \mathbf { \bar { \Sigma } } \times \mathbf { \Sigma } ( W / p )$ patches, each of which is linearly projected into a d-dimensional token representation. The resulting patch-token matrix is denoted as ${ \bf Z } ^ { ( 0 ) } \in \mathbb { R } ^ { N \times d }$ Following the DINOv3 design, the backbone is a ViT with $L$ Transformer blocks. Let $B _ { \ell }$ denote the ℓ-th Transformer block; the token sequence is updated as

$$
\begin{array} { r } { { \bf Z } ^ { ( \ell ) } = { \mathcal { B } } _ { \ell } \left( { \bf Z } ^ { ( \ell - 1 ) } \right) , \qquad \ell = 1 , \ldots , L . } \end{array}\tag{1}
$$

To harvest both low-level structure and high-level semantics, we collect intermediate token matrices from a subset of layers

$$
\begin{array} { r } { \mathcal { L } = \{ \ell _ { 1 } , \ell _ { 2 } , \ldots , \ell _ { K } \} \subseteq \{ 1 , \ldots , L \} . } \end{array}\tag{2}
$$

For each $\ell _ { k } \in { \mathcal { L } } .$ , we directly take the patch tokens $\mathbf { Z } _ { \mathrm { p } } ^ { ( \ell _ { k } ) } \in \mathbb { R } ^ { N \times d }$ from the ViT output and discard any non-patch tokens (e.g., class or register tokens). The encoder output is the multi-level token set

$$
\mathcal { F } = \left\{ \mathbf { Z } _ { \mathrm { p } } ^ { ( \ell _ { k } ) } \right\} _ { k = 1 } ^ { K } .\tag{3}
$$

These patch-token features are forwarded to the lightweight decoder (see Fig. 2) to produce segmentation representations. Freezing encoder stabilizes training and yields transferable features while keeping the trainable burden on the light decoder head.

## 2.3 L-DECODER

The proposed Light-Decoder follows a reform strategy similar to the upsampling and channel integration design in (Ranftl et al., 2021), where multi-level features are progressively aligned to a common spatial resolution and channel width. Let $\widetilde { \mathbf { Z } } ^ { ( \ell _ { k } ) } \in \mathbb { R } ^ { N \times C }$ denote the reformulated feature

![](Images_PDT8SCE7/d59bfaab166e0682e9efb831b4b8a100d12c82930af72f79d1f53cca07767e10.jpg)  
Figure 1: SegDINO couples a frozen DINOv3 with a lightweight decoder for efficient segmentation. Multi-layer features from different depths are upsampled, aligned, and concatenated, then passed to a super light MLP head to produce the final segmentation mask.

map obtained from each selected layer $\ell _ { k } \in { \mathcal { L } }$ . These features are concatenated along the channel dimension to form

$$
\mathcal { H } = \operatorname { C o n c a t } \left( \widetilde { \mathbf { Z } } ^ { ( \ell _ { 1 } ) } , \widetilde { \mathbf { Z } } ^ { ( \ell _ { 2 } ) } , \ldots , \widetilde { \mathbf { Z } } ^ { ( \ell _ { K } ) } \right) \in \mathbb { R } ^ { N \times K C } .\tag{4}
$$

The fused representation H is then passed through a lightweight decoder $\mathrm { D } _ { \theta _ { d } }$ , implemented as a multi-layer perceptron (MLP), to produce the final segmentation mask

$$
\begin{array} { r } { \widehat { \mathbf { y } } = \mathrm { D } _ { \theta _ { d } } ( \mathcal { H } ) , \qquad \widehat { \mathbf { y } } \in \mathbb { R } ^ { N \times n _ { \mathrm { c l a s s } } } , } \end{array}\tag{5}
$$

where $n _ { \mathrm { c l a s s } }$ denotes the number of semantic classes. This lightweight design ensures efficient training while retaining strong representational capacity for dense prediction.

## 3 EXPERIMENTS

## 3.1 DATASETS

Medical Image Datasets. We evaluate our method on three medical image segmentation benchmarks. TN3K (Gong et al., 2023) is a large-scale thyroid nodule segmentation dataset, containing 3,493 ultrasound images with pixel-level annotations collected from multiple hospitals. Kvasir-SEG (Jha et al., 2019) is a polyp segmentation dataset derived from colonoscopy examinations, consisting of 1,000 images with high-quality expert annotations. ISIC (Codella et al., 2018) is a skin lesion segmentation benchmark, providing 2,750 dermoscopic images annotated for lesion boundaries and covering a wide range of lesion types and acquisition conditions.

Natural Image Datasets. We conduct experiments on three representative benchmarks covering both mirror and shadow segmentation tasks. MSD (Yang et al., 2019) is a static image-based mirror segmentation dataset, containing 4,018 annotated images from diverse scenarios such as indoor mirrors, shop windows, and vehicle mirrors. VMD-D (Lin et al., 2023) is the first large-scale video mirror detection dataset, which consists of 269 videos (14,988 frames) with high-resolution annotations, capturing challenging dynamic conditions including camera motion, illumination variations, and multiple mirrors. VISHA (Chen et al., 2021c) is a widely used benchmark for video shadow detection, providing 11,685 video frames with fine-grained annotations.

## 3.2 IMPLEMENTATION DETAILS

Experimental Settings. For each dataset, we follow the official training–testing split provided by the organizers to ensure fair comparison. All images are resized to 256 × 256 for consistent input resolution across models, and normalized using the same mean and standard deviation parameters as in DINOv3 (Simeoni et al., 2025). ´

We implement all experiments with the PyTorch framework (Paszke et al., 2019). The models are optimized using AdamW (Loshchilov & Hutter, 2017) with a learning rate of $1 \times 1 0 ^ { - 4 }$ and a weight decay of $1 \times 1 0 ^ { - 4 }$ . Cross-entropy loss is employed as the training objective. Training is conducted for 50 epochs with a batch size of 4. For SegDINO, the DINO backbone is frozen, and only the decoder parameters are updated. In this work, we exclusively adopt the DINOv3-S backbone, from which intermediate features of the 3rd, 6th, 9th, and 12th Transformer layers are extracted. All experiments are run on a cloud platform equipped with four NVIDIA RTX A6000 GPUs.

Evaluation Metrics. For medical image datasets, we employ Dice similarity coefficient (DSC) and IoU to measure overlap between predictions and ground truth, together with the 95th percentile Hausdorff Distance (HD95) to evaluate boundary localization accuracy. For natural image datasets, we adopt intersection over union (IoU), pixel accuracy (Accuracy), F-measure $( F _ { \beta } )$ (Lin et al., 2023), mean absolute error (MAE), and balanced error rate (BER) to evaluate our method. For shadow segmentation, we additionally report Shadow-BER (S-BER) and Non-shadow-BER (N-BER) for class-specific assessment (Vicente et al., 2017).

Table 1: Comparison with state-of-the-art models for medical image segmentation.
<table><tr><td rowspan="2">Methods</td><td colspan="3">TN3K</td><td colspan="3">Kvasir-SEG</td><td colspan="3">ISIC</td></tr><tr><td>DSC↑</td><td>IoU↑</td><td>HD95↓</td><td>DSC↑</td><td>IoU↑</td><td>HD95↓</td><td>DSC↑</td><td>IoU↑</td><td>HD95↓</td></tr><tr><td>U-Net</td><td>0.7945</td><td>0.7065</td><td>24.59</td><td>0.7916</td><td>0.7029</td><td>41.58</td><td>0.8187</td><td>0.7295</td><td>25.12</td></tr><tr><td>SegNet</td><td>0.7924</td><td>0.7001</td><td>22.74</td><td>0.8415</td><td>0.7565</td><td>25.89</td><td>0.8327</td><td>0.7446</td><td>21.41</td></tr><tr><td>R2U-Net</td><td>0.6886</td><td>0.5935</td><td>27.89</td><td>0.7367</td><td>0.6328</td><td>45.64</td><td>0.8102</td><td>0.7134</td><td>25.36</td></tr><tr><td>Att-UNet</td><td>0.8015</td><td>0.7116</td><td>24.64</td><td>0.8016</td><td>0.7202</td><td>31.92</td><td>0.8275</td><td>0.7372</td><td>26.12</td></tr><tr><td>TransUNet</td><td>0.8027</td><td>0.7081</td><td>23.95</td><td>0.8054</td><td>0.7093</td><td>37.67</td><td>0.8186</td><td>0.7230</td><td>24.76</td></tr><tr><td>U-NeXt</td><td>0.7285</td><td>0.6245</td><td>31.40</td><td>0.6271</td><td>0.5164</td><td>58.32</td><td>0.8230</td><td>0.7327</td><td>23.63</td></tr><tr><td>U-KAN</td><td>0.7866</td><td>0.6960</td><td>24.49</td><td>0.7217</td><td>0.6381</td><td>36.92</td><td>0.8341</td><td>0.7462</td><td>23.57</td></tr><tr><td>SegDINO</td><td>0.8318</td><td>0.7443</td><td>18.62</td><td>0.8765</td><td>0.8064</td><td>20.80</td><td>0.8576</td><td>0.7760</td><td>17.80</td></tr></table>

Table 3: Results on the VMD-D dataset.

Table 2: Results on the MSD dataset.
<table><tr><td>Methods</td><td>IoU↑</td><td>Acc.↑</td><td> $F _ { \beta }$  个</td><td>MAE↓</td></tr><tr><td>SegFormer</td><td>0.879</td><td>0.953</td><td>0.915</td><td>0.038</td></tr><tr><td>Mask2Former</td><td>0.883</td><td>0.958</td><td>0.917</td><td>0.036</td></tr><tr><td>MirrorNet</td><td>0.845</td><td>0.948</td><td>0.892</td><td>0.044</td></tr><tr><td>PMDNet</td><td>0.847</td><td>0.952</td><td>0.898</td><td>0.033</td></tr><tr><td>VCNet</td><td>0.884</td><td>0.958</td><td>0.917</td><td>0.029</td></tr><tr><td>SANet</td><td>0.871</td><td>0.951</td><td>0.914</td><td>0.032</td></tr><tr><td>HetNet</td><td>0.888</td><td>0.964</td><td>0.918</td><td>0.030</td></tr><tr><td>CSFwinformer</td><td>0.875</td><td>0.960</td><td>0.918</td><td>0.032</td></tr><tr><td>SegDINO</td><td>0.942</td><td>0.985</td><td>0.971</td><td>0.015</td></tr></table>

<table><tr><td>Methods</td><td>IoU个</td><td>Acc.↑</td><td>个  $F _ { \beta }$ </td><td>MAE↓</td></tr><tr><td>TVSD STICT</td><td>0.480 0.164</td><td>0.875 0.809</td><td>0.746 0.530</td><td>0.125 0.198</td></tr><tr><td>Sc-Cor Scotch-Soda</td><td>0.512 0.587</td><td>0.863 0.870</td><td>0.696 0.706</td><td>0.137 0.124</td></tr><tr><td>HFAN</td><td>0.459</td><td>0.876</td><td></td><td></td></tr><tr><td>STCN</td><td>0.445</td><td>0.859</td><td>0.706</td><td>0.121 0.140</td></tr><tr><td>GlassNet</td><td>0.552</td><td>0.864</td><td>0.670</td><td></td></tr><tr><td>MirrorNet</td><td>0.580</td><td>0.864</td><td>0.718</td><td>0.137</td></tr><tr><td>PMDNet</td><td>0.532</td><td>0.872</td><td>0.724</td><td>0.135</td></tr><tr><td>VCNet</td><td>0.539</td><td>0.877</td><td>0.749</td><td>0.128</td></tr><tr><td>HetNet</td><td>0.531</td><td></td><td>0.749</td><td>0.123</td></tr><tr><td>VMD-Net</td><td>0.567</td><td>0.877 0.895</td><td>0.745 0.787</td><td>0.123 0.105</td></tr></table>

## 3.3 COMPARISON WITH EXISTING METHODS

Comparison on medical image benchmarks. We compare SegDINO with a diverse set of state-of-the-art segmentation models, including U-Net (Ronneberger et al., 2015), SegNet (Badrinarayanan et al., 2017), R2U-Net (Alom et al., 2018), Attention U-Net (Oktay et al., 2018), TransUNet (Chen et al., 2021a), U-NeXt (Valanarasu & Patel, 2022), and U-KAN (Li et al., 2025).

As shown in Table 1, both variants achieve consistent improvements across TN3K, Kvasir-SEG, and ISIC datasets. On TN3K, SegDINO yields the best Dice score of 0.8318, surpassing the strongest competitor TransUNet by +3% in DSC, +3.6% in IoU, and reducing HD95 from 23.95 to 18.62. On Kvasir-SEG, SegDINO achieves the highest performance with a Dice score of 0.8765 and IoU of 0.8064, outperforming the second-best SegNet by +3.5% in DSC and +5.0% in IoU, while decreasing HD95 from 25.89 to 20.80. On ISIC, SegDINO again leads with a Dice score of 0.8576 and

Table 4: Quantitative comparison on the ViSha dataset.
<table><tr><td>Methods</td><td>IoU↑</td><td> $F _ { \beta }$  ↑</td><td>MAE↓</td><td>BER↓</td><td>S-BER↓</td><td>N-BER↓</td></tr><tr><td>STM</td><td>0.408</td><td>0.598</td><td>0.069</td><td>25.69</td><td>47.44</td><td>3.95</td></tr><tr><td>COS-Net</td><td>0.515</td><td>0.706</td><td>0.040</td><td>20.51</td><td>39.22</td><td>1.79</td></tr><tr><td>MTMT</td><td>0.517</td><td>0.729</td><td>0.043</td><td>20.29</td><td>38.71</td><td>1.86</td></tr><tr><td>FSD</td><td>0.486</td><td>0.671</td><td>0.057</td><td>20.57</td><td>38.06</td><td>3.06</td></tr><tr><td>TVSD</td><td>0.556</td><td>0.757</td><td>0.033</td><td>17.70</td><td>33.97</td><td>1.45</td></tr><tr><td>STICT</td><td>0.545</td><td>0.702</td><td>0.046</td><td>16.60</td><td>29.58</td><td>3.59</td></tr><tr><td>Sc-Cor</td><td>0.615</td><td>0.762</td><td>0.042</td><td>13.61</td><td>24.31</td><td>2.91</td></tr><tr><td>Scotch-Soda</td><td>0.640</td><td>0.793</td><td>0.029</td><td>9.06</td><td>16.26</td><td>1.44</td></tr><tr><td>SATNet</td><td>0.521</td><td>0.730</td><td>0.046</td><td>21.18</td><td>38.64</td><td>3.02</td></tr><tr><td>CSFwinformer</td><td>0.525</td><td>0.733</td><td>0.040</td><td>20.01</td><td>36.54</td><td>1.99</td></tr><tr><td>VGSD-Net</td><td>0.548</td><td>0.733</td><td>0.052</td><td>19.98</td><td>35.24</td><td>3.67</td></tr><tr><td>TBG-Diff</td><td>0.667</td><td>0.797</td><td>0.023</td><td>8.58</td><td>16.00</td><td>1.15</td></tr><tr><td>SegDINO</td><td>0.675</td><td>0.821</td><td>0.017</td><td>8.05</td><td>14.90</td><td>0.82</td></tr></table>

![](Images_PDT8SCE7/00842ae2548fce3cc26b4aed2380ed87a0c63a9f5cca2b9d348e04b49f40f14b.jpg)

![](Images_PDT8SCE7/f64c156f9a0c3e68e60c3bb6e36d9754491289beb8e603e87ad0af7b10304a06.jpg)

![](Images_PDT8SCE7/f9086623b23f1f52896b0897d5f13c54faa1dac1f085a758fa71446b4097515b.jpg)  
Figure 2: Overall performance and efficiency comparisons across different datasets.

IoU of 0.7760, improving over the best baseline U-KAN by +2.3% in DSC and +3.0% in IoU, and lowering HD95 from 23.57 to 17.80.

Comparison on natural image benchmarks. We conduct comprehensive comparisons on three representative natural image segmentation benchmarks, including MSD for static mirror segmentation, VMD-D for dynamic video mirror detection, and ViSha for video shadow detection. On MSD, our SegDINO is compared with SegFormer (Xie et al., 2021), Mask2Former (Chen et al., 2021b), MirrorNet (Yang et al., 2019), PMDNet (Lin et al., 2020), VCNet (Tan et al., 2022), SANet (Guan et al., 2022), HetNet (He et al., 2023), and CSFwinformer (Xie et al., 2024). On VMD-D, we evaluate against TVSD (Chen et al., 2021c), STICT (Lu et al., 2022), Sc-Cor (Ding et al., 2022), Scotch-Soda (Liu et al., 2023), HFAN (Pei et al., 2022), STCN (Cheng et al., 2021), GlassNet (Lin et al., 2021), MirrorNet (Yang et al., 2019), PMDNet (Lin et al., 2020), VCNet (Tan et al., 2022), HetNet (He et al., 2023), and VMD-Net (Lin et al., 2023). On ViSha, we benchmark against STM (Oh et al., 2019), COS-Net (Lu et al., 2019), MTMT (Chen et al., 2020), FSD (Hu et al., 2021), TVSD (Chen et al., 2021c), STICT (Lu et al., 2022), Sc-Cor (Ding et al., 2022), Scotch-Soda (Liu et al., 2023), SATNet (Huang et al., 2023), CSFwinformer (Xie et al., 2024), VGSD-Net (Liu et al., 2024), and TBGDiff (Zhou et al., 2024a).

Across all three datasets, SegDINO consistently achieves the best results and surpasses existing approaches by clear margins. On MSD (Tab. 2), it outperforms the second-best method HetNet by over 5% in IoU, over 2% in accuracy, over 5% in $F _ { \beta }$ . On VMD-D (Tab. 3), it surpasses the strongest competitor VMD-Net with relative gains of more than 19% in IoU, over 3% in accuracy, over 6% in $F _ { \beta } .$ . On ViSha (Tab. 4), SegDINO improves over the second-best method TBG-Diff by nearly 1% in IoU, more than 2% in $F _ { \beta }$ , while also achieving significantly lower BER.

Efficiency Comparisons. As illustrated in Fig. 2, SegDINO demonstrates remarkable parameter efficiency while maintaining superior segmentation performance across both medical and natural datasets. On Kvasir, SegDINO achieves the best performance with only 2.21M trainable parameters. On the VMD-D dataset, SegDINO again delivers superior performance under a similarly compact parameter budget. Moreover, SegDINO sustains an inference speed of 53 FPS, exceeding most transformer-based methods while being slightly lower than convolution-based architectures. These results highlight that SegDINO consistently achieves the most favorable trade-off among performance, model size, and inference speed, establishing its advantage as a highly efficient solution for both medical and natural image segmentation.

## 4 CONCLUSION

In this work, we introduced SegDINO, a lightweight segmentation framework that couples a frozen DINOv3 backbone with a minimal MLP-based decoder. Our design directly addresses the longstanding challenge of adapting self-supervised representations to segmentation tasks without relying on heavy decoders. By reformulating multi-level patch tokens into a unified representation and employing an extremely light prediction head, SegDINO achieves strong segmentation accuracy while maintaining remarkable efficiency.

Extensive experiments across six benchmarks, including three medical datasets (TN3K, Kvasir-SEG, ISIC) and three natural image datasets (MSD, VMD-D, ViSha), consistently demonstrate the advantages of our approach. SegDINO surpasses existing state-of-the-art models by large margins on both natural and medical image tasks, highlighting the effectiveness of leveraging foundation model features through a lightweight decoding pipeline. Notably, the results show that even a frozen DINOv3 backbone, when paired with a carefully designed light decoder, can outperform models that require significantly more parameters and computation. This validates our central hypothesis that decoder simplicity does not necessarily compromise segmentation performance when foundation features are properly exploited.

Despite these strengths, SegDINO is not without limitations. First, by freezing the encoder, the adaptability of features to highly domain-specific distributions (e.g., rare pathological cases) may be constrained. Second, while our results confirm the benefits of lightweight decoding, further ablation studies are needed to better understand the contributions of individual components, such as feature selection depth, reformulation strategies, and decoder design. These analyses would provide deeper insights into the robustness of our framework and guide future architectural refinements.

## REFERENCES

Md Zahangir Alom, Mahmudul Hasan, Chris Yakopcic, Tarek M Taha, and Vijayan K Asari. Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation. arXiv preprint arXiv:1802.06955, 2018.

Tomer Amit, Tal Shaharbany, Eliya Nachmani, and Lior Wolf. Segdiff: Image segmentation with diffusion probabilistic models. arXiv preprint arXiv:2112.00390, 2021.

Lev Ayzenberg, Raja Giryes, and Hayit Greenspan. Dinov2 based self supervised learning for few shot medical image segmentation. In 2024 IEEE International Symposium on Biomedical Imaging (ISBI), pp. 1–5. IEEE, 2024.

Reza Azad, Ehsan Khodapanah Aghdam, Amelie Rauland, Yiwei Jia, Atlas Haddadi Avval, Afshin Bozorgpour, Sanaz Karimijafarbigloo, Joseph Paul Cohen, Ehsan Adeli, and Dorit Merhof. Medical image segmentation review: The success of u-net. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2024.

Vijay Badrinarayanan, Alex Kendall, and Roberto Cipolla. Segnet: A deep convolutional encoderdecoder architecture for image segmentation. IEEE transactions on pattern analysis and machine intelligence, 39(12):2481–2495, 2017.

Mathilde Caron, Hugo Touvron, Ishan Misra, Herve J ´ egou, Julien Mairal, Piotr Bojanowski, and ´ Armand Joulin. Emerging properties in self-supervised vision transformers. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 9650–9660, 2021.

Jieneng Chen, Yongyi Lu, Qihang Yu, Xiangde Luo, Ehsan Adeli, Yan Wang, Le Lu, Alan L Yuille, and Yuyin Zhou. Transunet: Transformers make strong encoders for medical image segmentation. arXiv preprint arXiv:2102.04306, 2021a.

Wuyang Chen, Xianzhi Du, Fan Yang, Lucas Beyer, Xiaohua Zhai, Tsung-Yi Lin, Huizhong Chen, Jing Li, Xiaodan Song, Zhangyang Wang, et al. A simple single-scale vision transformer for object localization and instance segmentation. arXiv preprint arXiv:2112.09747, 2021b.

Zhihao Chen, Lei Zhu, Liang Wan, Song Wang, Wei Feng, and Pheng-Ann Heng. A multi-task mean teacher for semi-supervised shadow detection. In Proceedings of the IEEE/CVF Conference on computer vision and pattern recognition, pp. 5611–5620, 2020.

Zhihao Chen, Liang Wan, Lei Zhu, Jia Shen, Huazhu Fu, Wennan Liu, and Jing Qin. Triplecooperative video shadow detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 2715–2724, 2021c.

Ho Kei Cheng, Yu-Wing Tai, and Chi-Keung Tang. Rethinking space-time networks with improved memory coverage for efficient video object segmentation. Advances in neural information processing systems, 34:11781–11794, 2021.

Noel CF Codella, David Gutman, M Emre Celebi, Brian Helba, Michael A Marchetti, Stephen W Dusza, Aadi Kalloo, Konstantinos Liopyris, Nabin Mishra, Harald Kittler, et al. Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic). In 2018 IEEE 15th international symposium on biomedical imaging (ISBI 2018), pp. 168–172. IEEE, 2018.

Simon Damm, Mike Laszkiewicz, Johannes Lederer, and Asja Fischer. Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2. In 2025 IEEE/CVF Winter Conference on Applications of Computer Vision (WACV), pp. 1319–1329. IEEE, 2025.

Xinpeng Ding, Jingwen Yang, Xiaowei Hu, and Xiaomeng Li. Learning shadow correspondence for video shadow detection. In European Conference on Computer Vision, pp. 705–722. Springer, 2022.

Yifan Gao, Haoyue Li, Feng Yuan, Xiaosong Wang, and Xin Gao. Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025.

Haifan Gong, Jiaxin Chen, Guanqi Chen, Haofeng Li, Guanbin Li, and Fei Chen. Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules. Computers in biology and medicine, 155:106389, 2023.

Huankang Guan, Jiaying Lin, and Rynson WH Lau. Learning semantic associations for mirror detection. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp. 5941–5950, 2022.

Kaiming He, Xinlei Chen, Saining Xie, Yanghao Li, Piotr Dollar, and Ross Girshick. Masked au- ´ toencoders are scalable vision learners. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 16000–16009, 2022.

Ruozhen He, Jiaying Lin, and Rynson WH Lau. Efficient mirror detection via multi-level heterogeneous learning. In Proceedings of the AAAI Conference on Artificial Intelligence, volume 37, pp. 790–798, 2023.

Xiaowei Hu, Tianyu Wang, Chi-Wing Fu, Yitong Jiang, Qiong Wang, and Pheng-Ann Heng. Revisiting shadow detection: A new benchmark dataset for complex world. IEEE Transactions on Image Processing, 30:1925–1934, 2021.

Tianyu Huang, Bowen Dong, Jiaying Lin, Xiaohui Liu, Rynson WH Lau, and Wangmeng Zuo. Symmetry-aware transformer-based mirror detection. In Proceedings of the aaai conference on artificial intelligence, volume 37, pp. 935–943, 2023.

Jitesh Jain, Jiachen Li, Mang Tik Chiu, Ali Hassani, Nikita Orlov, and Humphrey Shi. Oneformer: One transformer to rule universal image segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 2989–2998, 2023.

Debesh Jha, Pia H Smedsrud, Michael A Riegler, Pal Halvorsen, Thomas De Lange, Dag Johansen, ˚ and Havard D Johansen. Kvasir-seg: A segmented polyp dataset. In ˚ International conference on multimedia modeling, pp. 451–462. Springer, 2019.

Alexander Kirillov, Eric Mintun, Nikhila Ravi, Hanzi Mao, Chloe Rolland, Laura Gustafson, Tete Xiao, Spencer Whitehead, Alexander C Berg, Wan-Yen Lo, et al. Segment anything. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 4015–4026, 2023.

Chenxin Li, Xinyu Liu, Wuyang Li, Cheng Wang, Hengyu Liu, Yifan Liu, Zhen Chen, and Yixuan Yuan. U-kan makes strong backbone for medical image segmentation and generation. In Proceedings of the AAAI Conference on Artificial Intelligence, volume 39, pp. 4652–4660, 2025.

Xiangtai Li, Henghui Ding, Haobo Yuan, Wenwei Zhang, Jiangmiao Pang, Guangliang Cheng, Kai Chen, Ziwei Liu, and Chen Change Loy. Transformer-based visual segmentation: A survey. IEEE transactions on pattern analysis and machine intelligence, 2024.

Jiaying Lin, Guodong Wang, and Rynson WH Lau. Progressive mirror detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 3697–3705, 2020.

Jiaying Lin, Zebang He, and Rynson WH Lau. Rich context aggregation with reflection prior for glass surface detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 13415–13424, 2021.

Jiaying Lin, Xin Tan, and Rynson WH Lau. Learning to detect mirrors from videos via dual correspondences. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 9109–9118, 2023.

Fang Liu, Yuhao Liu, Jiaying Lin, Ke Xu, and Rynson WH Lau. Multi-view dynamic reflection prior for video glass surface detection. In Proceedings of the AAAI Conference on Artificial Intelligence, volume 38, pp. 3594–3602, 2024.

Lihao Liu, Jean Prost, Lei Zhu, Nicolas Papadakis, Pietro Lio, Carola-Bibiane Sch \` onlieb, and An- ¨ gelica I Aviles-Rivero. Scotch and soda: A transformer video shadow detection framework. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 10449– 10458, 2023.

Jonathan Long, Evan Shelhamer, and Trevor Darrell. Fully convolutional networks for semantic segmentation. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp. 3431–3440, 2015.

Ilya Loshchilov and Frank Hutter. Decoupled weight decay regularization. arXiv preprint arXiv:1711.05101, 2017.

Xiankai Lu, Wenguan Wang, Chao Ma, Jianbing Shen, Ling Shao, and Fatih Porikli. See more, know more: Unsupervised video object segmentation with co-attention siamese networks. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 3623– 3632, 2019.

Xiao Lu, Yihong Cao, Sheng Liu, Chengjiang Long, Zipei Chen, Xuanyu Zhou, Yimin Yang, and Chunxia Xiao. Video shadow detection via spatio-temporal interpolation consistency training. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp. 3116–3125, 2022.

Jun Ma, Feifei Li, and Bo Wang. U-mamba: Enhancing long-range dependency for biomedical image segmentation. arXiv preprint arXiv:2401.04722, 2024.

Maciej A Mazurowski, Haoyu Dong, Hanxue Gu, Jichen Yang, Nicholas Konz, and Yixin Zhang. Segment anything model for medical image analysis: an experimental study. Medical Image Analysis, 89:102918, 2023.

Shervin Minaee, Yuri Boykov, Fatih Porikli, Antonio Plaza, Nasser Kehtarnavaz, and Demetri Terzopoulos. Image segmentation using deep learning: A survey. IEEE transactions on pattern analysis and machine intelligence, 44(7):3523–3542, 2021.

Seoung Wug Oh, Joon-Young Lee, Ning Xu, and Seon Joo Kim. Video object segmentation using space-time memory networks. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 9226–9235, 2019.

Ozan Oktay, Jo Schlemper, Loic Le Folgoc, Matthew Lee, Mattias Heinrich, Kazunari Misawa, Kensaku Mori, Steven McDonagh, Nils Y Hammerla, Bernhard Kainz, et al. Attention u-net: Learning where to look for the pancreas. arXiv preprint arXiv:1804.03999, 2018.

Maxime Oquab, Timothee Darcet, Th ´ eo Moutakanni, Huy Vo, Marc Szafraniec, Vasil Khalidov, ´ Pierre Fernandez, Daniel Haziza, Francisco Massa, Alaaeldin El-Nouby, et al. Dinov2: Learning robust visual features without supervision. arXiv preprint arXiv:2304.07193, 2023.

Adam Paszke, Sam Gross, Francisco Massa, Adam Lerer, James Bradbury, Gregory Chanan, Trevor Killeen, Zeming Lin, Natalia Gimelshein, Luca Antiga, et al. Pytorch: An imperative style, highperformance deep learning library. Advances in neural information processing systems, 32, 2019.

Gensheng Pei, Fumin Shen, Yazhou Yao, Guo-Sen Xie, Zhenmin Tang, and Jinhui Tang. Hierarchical feature alignment network for unsupervised video object segmentation. In European Conference on Computer Vision, pp. 596–613. Springer, 2022.

Rene Ranftl, Alexey Bochkovskiy, and Vladlen Koltun. Vision transformers for dense prediction. ´ In Proceedings of the IEEE/CVF international conference on computer vision, pp. 12179–12188, 2021.

Olaf Ronneberger, Philipp Fischer, and Thomas Brox. U-net: Convolutional networks for biomedical image segmentation. In International Conference on Medical image computing and computerassisted intervention, pp. 234–241. Springer, 2015.

Oriane Simeoni, Huy V Vo, Maximilian Seitzer, Federico Baldassarre, Maxime Oquab, Cijo Jose, ´ Vasil Khalidov, Marc Szafraniec, Seungeun Yi, Michael Ramamonjisoa, et al. Dinov3. ¨ arXiv preprint arXiv:2508.10104, 2025.

Robin Strudel, Ricardo Garcia, Ivan Laptev, and Cordelia Schmid. Segmenter: Transformer for semantic segmentation. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 7262–7272, 2021.

Xin Tan, Jiaying Lin, Ke Xu, Pan Chen, Lizhuang Ma, and Rynson WH Lau. Mirror detection with the visual chirality cue. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(3): 3492–3504, 2022.

Jeya Maria Jose Valanarasu and Vishal M Patel. Unext: Mlp-based rapid medical image segmentation network. In International conference on medical image computing and computer-assisted intervention, pp. 23–33. Springer, 2022.

Tomas F Yago Vicente, Minh Hoai, and Dimitris Samaras. Leave-one-out kernel optimization for shadow detection and removal. IEEE Transactions on Pattern Analysis and Machine Intelligence, 40(3):682–695, 2017.

Hongqiu Wang, Jian Chen, Shichen Zhang, Yuan He, Jinfeng Xu, Mengwan Wu, Jinlan He, Wenjun Liao, and Xiangde Luo. Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals. IEEE Transactions on Medical Imaging, 43(12):4078–4090, 2024a.

Hongqiu Wang, Guang Yang, Shichen Zhang, Jing Qin, Yike Guo, Bo Xu, Yueming Jin, and Lei Zhu. Video-instrument synergistic network for referring video instrument segmentation in robotic surgery. IEEE Transactions on Medical Imaging, 2024b.

Hongqiu Wang, Yixian Chen, Wu Chen, Huihui Xu, Haoyu Zhao, Bin Sheng, Huazhu Fu, Guang Yang, and Lei Zhu. Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model. IEEE Transactions on Medical Imaging, 2025a.

Jianyuan Wang, Minghao Chen, Nikita Karaev, Andrea Vedaldi, Christian Rupprecht, and David Novotny. Vggt: Visual geometry grounded transformer. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp. 5294–5306, 2025b.

Shansong Wang, Mojtaba Safari, Mingzhe Hu, Qiang Li, Chih-Wei Chang, Richard LJ Qiu, and Xiaofeng Yang. Dinov3 with test-time training for medical image registration. arXiv preprint arXiv:2508.14809, 2025c.

Junde Wu, Rao Fu, Huihui Fang, Yu Zhang, Yehui Yang, Haoyi Xiong, Huiying Liu, and Yanwu Xu. Medsegdiff: Medical image segmentation with diffusion probabilistic model. In Medical Imaging with Deep Learning, pp. 1623–1639. PMLR, 2024.

Enze Xie, Wenhai Wang, Zhiding Yu, Anima Anandkumar, Jose M Alvarez, and Ping Luo. Segformer: Simple and efficient design for semantic segmentation with transformers. Advances in neural information processing systems, 34:12077–12090, 2021.

Zhifeng Xie, Sen Wang, Qiucheng Yu, Xin Tan, and Yuan Xie. Csfwinformer: Cross-spacefrequency window transformer for mirror detection. IEEE Transactions on Image Processing, 33:1853–1867, 2024.

Zhaohu Xing, Tian Ye, Yijun Yang, Guang Liu, and Lei Zhu. Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation. In International conference on medical image computing and computer-assisted intervention, pp. 578–588. Springer, 2024.

Lihe Yang, Zhen Zhao, and Hengshuang Zhao. Unimatch v2: Pushing the limit of semi-supervised semantic segmentation. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2025.

Xin Yang, Haiyang Mei, Ke Xu, Xiaopeng Wei, Baocai Yin, and Rynson WH Lau. Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp. 8809–8818, 2019.

Chiyuan Zhang, Samy Bengio, Moritz Hardt, Benjamin Recht, and Oriol Vinyals. Understanding deep learning (still) requires rethinking generalization. Communications of the ACM, 64(3):107– 115, 2021.

Zhuoyang Zhang, Han Cai, and Song Han. Efficientvit-sam: Accelerated segment anything model without performance loss. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp. 7859–7863, 2024.

Xu Zhao, Wenchao Ding, Yongqi An, Yinglong Du, Tao Yu, Min Li, Ming Tang, and Jinqiao Wang. Fast segment anything. arXiv preprint arXiv:2306.12156, 2023.

Haipeng Zhou, Hongqiu Wang, Tian Ye, Zhaohu Xing, Jun Ma, Ping Li, Qiong Wang, and Lei Zhu. Timeline and boundary guided diffusion network for video shadow detection. In Proceedings of the 32nd ACM International Conference on Multimedia, pp. 166–175, 2024a.

Tianfei Zhou, Wang Xia, Fei Zhang, Boyu Chang, Wenguan Wang, Ye Yuan, Ender Konukoglu, and Daniel Cremers. Image segmentation in foundation model era: A survey. arXiv preprint arXiv:2408.12957, 2024b.

Lei Zhu, Fangyun Wei, Yanye Lu, and Dong Chen. Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99%. Advances in Neural Information Processing Systems, 37:12612– 12635, 2024.