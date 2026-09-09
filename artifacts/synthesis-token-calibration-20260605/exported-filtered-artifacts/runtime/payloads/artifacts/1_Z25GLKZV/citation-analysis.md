#### 总体总结
原文在引言与相关工作部分通过三条主要研究脉络组织引文：首先追溯从RNN/LSTM到注意力机制的序列建模范式演进，确立循环架构的历史地位及其顺序计算瓶颈；其次梳理卷积序列模型（ConvS2S、ByteNet）作为并行化替代方案的尝试与局限；最后聚焦于注意力机制本身的多样化发展，从结构化注意力到可分解注意力，为Transformer纯注意力架构的提出铺平道路。论述动作上，先铺技术背景（RNN主导但受限），再对比主流范式（卷积并行但长程依赖困难），最后引出本文路线（纯注意力实现完全并行化）。


#### 关键文献

- [2] Bahdanau, D., 2014: Neural machine translation by jointly learning to align and translate (Background)

- [8] Gehring, J., 2017: Convolutional sequence to sequence learning (Contrast)

- [9] Graves, A., 2013: Generating sequences with recurrent neural networks (Background)

- [17] Ba, D.K.a.J., 2015: Adam: A method for stochastic optimization (Component)

- [21] Luong, M., 2015: Effective approaches to attentionbased neural machine translation (Background)

- [29] Sutskever, I., 2014: Sequence to sequence learning with neural networks (Background)



#### 范围
- 章节: Introduction through Conclusion
- 行号: 25-222

#### 按功能归类


##### Component

- [1] Ba, J.L., 2016
  - 标题: Layer normalization
  - 关键词: layer normalization, training stability, residual connection
  - 总结: 原文在层归一化技术的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [10] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: residual learning, ResNet, skip connection
  - 总结: 原文在残差学习的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [17] Ba, D.K.a.J., 2015
  - 标题: Adam: A method for stochastic optimization
  - 关键词: Adam optimizer, stochastic optimization, training
  - 总结: 原文在Adam优化器的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。

- [24] Wolf, O.P.a.L., 2016
  - 标题: Using the output embedding to improve language models
  - 关键词: output embedding, weight sharing, language model
  - 总结: 原文在输出嵌入改进语言模型的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [25] Sennrich, R., 2015
  - 标题: Neural machine translation of rare words with subword units
  - 关键词: BPE, subword units, rare words
  - 总结: 原文在子词单元处理稀有词的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。

- [27] Srivastava, N., 2014
  - 标题: Dropout: a simple way to prevent neural networks from overfitting
  - 关键词: dropout, regularization, overfitting prevention
  - 总结: 原文在Dropout正则化的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。



##### Background

- [2] Bahdanau, D., 2014
  - 标题: Neural machine translation by jointly learning to align and translate
  - 关键词: attention, machine translation, encoder-decoder
  - 总结: 原文在注意力机制在机器翻译中的应用的上下文中引用该工作，作为关键基线，建立研究背景。

- [3] Britz, D., 2017
  - 标题: Massive exploration of neural machine translation architectures
  - 关键词: NMT architectures, transformer comparison
  - 总结: 原文在神经机器翻译架构探索的上下文中引用该工作，作为技术背景，建立研究背景。

- [4] Cheng, J., 2016
  - 标题: Long short-term memory-networks for machine reading
  - 关键词: LSTM, reading comprehension, self-attention context
  - 总结: 原文在LSTM在阅读理解中的应用的上下文中引用该工作，作为技术背景，建立研究背景。

- [5] Cho, K., 2014
  - 标题: Learning phrase representations using rnn encoder-decoder for statistical machine translation
  - 关键词: RNN, encoder-decoder, sequence modeling
  - 总结: 原文在RNN编码器-解码器的上下文中引用该工作，作为技术背景，建立研究背景。

- [6] Chollet, F., 2016
  - 标题: Xception: Deep learning with depthwise separable convolutions
  - 关键词: separable convolutions, computational complexity
  - 总结: 原文在深度可分离卷积的上下文中引用该工作，作为技术背景，建立研究背景。

- [7] Chung, J., 2014
  - 标题: Empirical evaluation of gated recurrent neural networks on sequence modeling
  - 关键词: GRU, sequence modeling, RNN variants
  - 总结: 原文在门控循环神经网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [9] Graves, A., 2013
  - 标题: Generating sequences with recurrent neural networks
  - 关键词: RNN, sequence generation, autoregressive
  - 总结: 原文在RNN序列生成的上下文中引用该工作，作为技术背景，建立研究背景。

- [11] Hochreiter, S., 2001
  - 标题: Gradient flow in recurrent nets: the difficulty of learning long-term dependencies, 2001
  - 关键词: gradient flow, long-term dependencies, RNN limitations
  - 总结: 原文在循环网络中的梯度流的上下文中引用该工作，作为技术背景，建立研究背景。

- [12] Schmidhuber, S.H.a.J., 1997
  - 标题: Long short-term memory
  - 关键词: LSTM, sequence modeling, RNN
  - 总结: 原文在LSTM的上下文中引用该工作，作为技术背景，建立研究背景。

- [13] Jozefowicz, R., 2016
  - 标题: Exploring the limits of language modeling
  - 关键词: language modeling, scaling, limits
  - 总结: 原文在语言模型极限探索的上下文中引用该工作，作为技术背景，建立研究背景。

- [14] Sutskever, Ł.K.a.I., 2016
  - 标题: Neural GPUs learn algorithms
  - 关键词: neural GPU, parallel sequence, convolutional
  - 总结: 原文在神经GPU的上下文中引用该工作，作为技术背景，建立研究背景。

- [16] Kim, Y., 2017
  - 标题: Structured attention networks
  - 关键词: structured attention, attention variants
  - 总结: 原文在结构化注意力网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [18] Ginsburg, O.K.a.B., 2017
  - 标题: Factorization tricks for LSTM networks
  - 关键词: LSTM factorization, computational efficiency
  - 总结: 原文在LSTM因子化技巧的上下文中引用该工作，作为技术背景，建立研究背景。

- [19] Lin, Z., 2017
  - 标题: A structured self-attentive sentence embedding
  - 关键词: self-attention, sentence embedding, NLP applications
  - 总结: 原文在结构化自注意句子嵌入的上下文中引用该工作，作为技术背景，建立研究背景。

- [20] Kaiser, S.B.Ł., 2016
  - 标题: Can active memory replace attention? In Advances in Neural Information Processing Systems, (NIPS), 2016
  - 关键词: active memory, attention alternative, NIPS
  - 总结: 原文在主动记忆与注意力的上下文中引用该工作，作为技术背景，建立研究背景。

- [21] Luong, M., 2015
  - 标题: Effective approaches to attentionbased neural machine translation
  - 关键词: attention NMT, effective approaches, Luong attention
  - 总结: 原文在注意力神经机器翻译的上下文中引用该工作，作为关键基线，建立研究背景。

- [22] Parikh, A., 2016
  - 标题: A decomposable attention model
  - 关键词: decomposable attention, NLP, EMNLP
  - 总结: 原文在可分解注意力模型的上下文中引用该工作，作为技术背景，建立研究背景。

- [23] Paulus, R., 2017
  - 标题: A deep reinforced model for abstractive summarization
  - 关键词: reinforcement learning, summarization, self-attention application
  - 总结: 原文在强化摘要模型的上下文中引用该工作，作为技术背景，建立研究背景。

- [26] Shazeer, N., 2017
  - 标题: Outrageously large neural networks: The sparsely-gated mixture-of-experts layer
  - 关键词: mixture-of-experts, scaling, sparse networks
  - 总结: 原文在混合专家层的上下文中引用该工作，作为技术背景，建立研究背景。

- [28] Sukhbaatar, S., 2015
  - 标题: End-to-end memory networks
  - 关键词: memory networks, recurrent attention, NIPS
  - 总结: 原文在端到端记忆网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [29] Sutskever, I., 2014
  - 标题: Sequence to sequence learning with neural networks
  - 关键词: seq2seq, neural machine translation, NIPS
  - 总结: 原文在序列到序列学习的上下文中引用该工作，作为关键基线，建立研究背景。

- [31] Wu, Y., 2016
  - 标题: Google’s neural machine translation system: Bridging the gap between human and machine translation
  - 关键词: GNMT, production NMT, Google translation
  - 总结: 原文在Google神经机器翻译系统的上下文中引用该工作，作为关键基线，建立研究背景。



##### Contrast

- [8] Gehring, J., 2017
  - 标题: Convolutional sequence to sequence learning
  - 关键词: ConvS2S, convolutional sequence, baseline comparison
  - 总结: 原文在卷积序列到序列学习的上下文中引用该工作，作为关键基线，与Transformer进行对比。

- [15] Kalchbrenner, N., 2017
  - 标题: Neural machine translation in linear time
  - 关键词: ByteNet, linear time, dilated convolution
  - 总结: 原文在线性时间神经机器翻译的上下文中引用该工作，作为技术背景，与Transformer进行对比。



##### Baseline

- [32] Zhou, J., 2016
  - 标题: Deep recurrent models with fast-forward connections for neural machine translation
  - 关键词: fast-forward connections, recurrent models, NMT baseline, BLEU comparison
  - 总结: 原文在结果表格中引用该工作作为性能对比基线，展示Transformer在BLEU分数和训练效率上均优于该模型。
