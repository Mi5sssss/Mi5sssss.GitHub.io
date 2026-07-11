# References and receipts

Every non-consensus claim in the article rests on something. Here is the something. Where a claim depends on a single lab's unpublished practice it is marked as inference, not fact, and you should hold it that way.

## The spine, pretraining is dissolving not ending
- Ilya Sutskever, NeurIPS 2024 test of time talk. The framing that pretraining as we know it will end and that data is the fossil fuel of AI. Widely reported from the talk. Treat the exact wording as paraphrase.
- The pretrain, mid-training, post-training continuum is an industry-practice observation drawn from public technical reports. Inference, not a single citable law.

## Foundations, what next token prediction learns
- Compression as understanding. The intuition traces to the Solomonoff and Kolmogorov view of prediction as compression, revived in modern form in talks by Ilya Sutskever and in the general compression-equals-intelligence literature.
- The bag of heuristics and superposition view. Anthropic mechanistic interpretability work. Elhage et al., Toy Models of Superposition, 2022. Follow-on dictionary learning and features work, 2023 to 2024.

## Data, wall and collapse
- Data constrained scaling and repeating data. Muennighoff et al., Scaling Data-Constrained Language Models, NeurIPS 2023. The result that up to roughly four epochs of repeated data is nearly as good as fresh data.
- Model collapse. Shumailov et al., AI models collapse when trained on recursively generated data, Nature 2024. Note the mechanism is naive recursive self training, which is the point the article makes.
- Deduplication effects. Lee et al., Deduplicating Training Data Makes Language Models Better, 2021 to 2022.
- Contamination and benchmark leakage. A broad literature. Treat the specific magnitude claim as informed inference.

## Data pipeline specifics (post 1)
- Deduplication improving models. Lee et al., Deduplicating Training Data Makes Language Models Better, 2021 to 2022. Also see the MinHash and LSH treatment in Broder 1997 and Leskovec, Rajaraman, Ullman, Mining of Massive Datasets.
- Tokenizer fertility and the non-English tax. A widely observed effect of byte-level BPE trained on English-heavy corpora. The experiment tokenizer_fertility.py reproduces it from first principles, the penalty follows from UTF-8 byte counts for non-Latin scripts.
- Reasoning transfer from code and math data. Reported across multiple model technical reports. Treat as informed inference from public practice.

## Architecture, convergence and the hardware lottery
- The bitter lesson. Rich Sutton, 2019.
- The hardware lottery. Sara Hooker, 2020. The argument that architectures win partly because they suit existing hardware.
- State space models as the contingent challenger. Gu and Dao, Mamba, 2023, and the broader structured state space line. Used in post 2 to argue the convergence is contingent on current hardware, not eternal.
- Grouped query attention. Ainslie et al., 2023. Multi query attention, Shazeer, 2019.
- Multi head latent attention. DeepSeek V2 technical report, 2024.
- The specific list of converged components (decoder only, RoPE, RMSNorm, SwiGLU) is an observation across public model reports. RoPE, Su et al., 2021. RMSNorm, Zhang and Sennrich, 2019. SwiGLU, Shazeer, 2020.

## Infrastructure and the semiconductor turn
- Four dimensional parallelism. Megatron-LM and related, Shoeybi et al., 2019 onward. ZeRO, Rajbhandari et al., 2020.
- FP8 training. Micikevicius et al. and vendor technical material, 2022 onward. The bandwidth framing is the article's interpretation.
- DeepSeek V3 cost. DeepSeek V3 technical report, 2024. The reported low training cost. Treat as reported, since such figures exclude research, failed runs, and staff.
- Packaging and HBM as the binding constraint. CoWoS packaging capacity and HBM supply concentration among a small number of vendors is widely reported in semiconductor industry coverage. Industry analysis, not a single paper.
- Depreciation dominating training cost. An economics argument from public capex and hardware refresh cadence. Inference from public financials, not a cited figure.

## The fab problem (post 3)
- The memory wall, original. Wulf and McKee, Hitting the Memory Wall, 1995.
- The memory wall, modern revival for deep learning. Gholami et al., AI and Memory Wall, 2021 with later updates. The observation that peak compute has grown far faster than memory and interconnect bandwidth.
- Roofline model. Williams, Waterman, Patterson, Roofline, an insightful visual performance model, 2009. The ridge point and compute versus memory bound framing.
- KV cache and attention variants as bandwidth reductions. Multi query, Shazeer 2019. Grouped query, Ainslie et al. 2023. Multi head latent attention, DeepSeek V2 report 2024. The bandwidth framing is the post's interpretation, backed by the arithmetic in kv_cache_bandwidth.py.
- FP8 training. Micikevicius et al. and vendor material, 2022 onward. The format arithmetic in fp8_bandwidth.py uses textbook exponent and mantissa reasoning and is illustrative, real FP8 E4M3 reaches a higher max normal via special encoding.
- Collective communication and the ring all reduce cost of 2(P-1)/P times the message. Standard result, see NCCL and Megatron and ZeRO literature.
- HBM supply concentrated among three makers (SK Hynix, Samsung, Micron) and TSMC CoWoS advanced packaging as the gating capacity constraint. Widely reported across semiconductor industry coverage during the recent build out. Industry analysis, not a single paper.
- Depreciation dominating training cost, the melting asset, Jensen's law as an informal faster-than-Moore observation, and the circular financing pattern between chip maker and chip buyers. Arguments from public capex, hardware refresh cadence, and reported financing arrangements. Inference and reporting, not audited figures.
- All quantitative results in the post come from the four scripts in the experiments folder, which use illustrative H100 class peaks and a 70B class shape.

## Scaling laws
- Early laws. Kaplan et al., Scaling Laws for Neural Language Models, 2020.
- Chinchilla. Hoffmann et al., Training Compute-Optimal Large Language Models, 2022. The roughly twenty tokens per parameter result and the parametric loss form used in the interactive component.
- Overtraining for inference efficiency. Widely practiced and discussed. See analysis around Llama scale models trained far past Chinchilla optimal. The whole-lifetime framing is the article's argument.
- Test time compute as a new axis. The reasoning model line, 2024 onward. Public technical material.
- Emergence as mirage. Schaeffer, Miranda, Koyejo, Are Emergent Abilities of Large Language Models a Mirage?, NeurIPS 2023.
- Grokking. Power et al., 2022.

## Industry and academia
- The convergence of architectures and the shift of competition to data and post training. An observation across public model reports. Inference.
- Open weights versus open recipe. The point that recipes are guarded more than weights is an industry-practice observation.

## A note on the numbers in the interactive components
All quantitative displays in the components are illustrative. The scaling law component uses the published Chinchilla parametric constants for shape, but absolute loss values are not calibrated to any specific model. The data survival percentages, mixture-to-capability mappings, MoE parameter counts, and parallelism utilization figures are chosen to teach the mechanism, not to report a measurement.
