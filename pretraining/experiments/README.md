# Small experiments

Ten runnable experiments that turn the arguments in the series into numbers you can reproduce. Stdlib Python only, no frameworks, no downloads. Each one prints a table and a reading. Run any of them with python3, for example python3 roofline.py.

### Post 1, data

| File | Claim it makes concrete | Headline result |
|---|---|---|
| minhash_dedup.py | Near-duplicate detection is what dedup actually is, and it works | MinHash estimates true document overlap within 0.05, and LSH flags the reworded and boilerplate-padded copies (true similarity 0.70 and 0.81) while leaving unrelated docs alone. |
| tokenizer_fertility.py | A tokenizer taxes non-English and code for the life of the model | A from-scratch byte-level BPE trained on English encodes code at 1.4x its token cost, Russian at 3.6x, Chinese at 5.4x. |

### Post 2, the hardware lottery

| File | Claim it makes concrete | Headline result |
|---|---|---|
| moe_params.py | MoE is a memory-versus-compute trade | A 256-expert top-8 MoE carries 1102 B total parameters while activating only 37 B per token, a 30x ratio that all has to live in memory. |
| attention_vs_ffn_flops.py | Most compute is feedforward, not attention, until long context | At 512 tokens about two thirds of the FLOPs are feedforward. The quadratic attention term only takes over past roughly 32k tokens. |

### Post 3, the fab problem

| File | Claim it makes concrete | Headline result |
|---|---|---|
| kv_cache_bandwidth.py | GQA and MLA are bandwidth tricks, not accuracy tricks | An MHA model at 128k context must stream 312 GB per token, capping decode near 10 tokens per second. GQA cuts that to 39 GB, MLA to under 10 GB. |
| roofline.py | Training is compute bound, decode is memory bound, on the same silicon | Ridge point near 296 FLOP per byte. Training sits at arithmetic intensity 5000 and runs at peak. Decode sits at 1 and runs at 0.3 percent of peak. |
| allreduce_tax.py | Beyond a point the network, not the chip, sets your training efficiency | At 16k GPUs, the gradient all reduce is a rounding error on a fast local fabric and 96 percent of the step on a slow cross node one. |
| fp8_bandwidth.py | FP8 is a bandwidth play wearing a numerics costume | FP8 carries a quarter of the bytes of FP32, so memory bound kernels run up to four times faster from touching fewer bytes, on top of any FLOP gain. |

### Post 4, the death of Chinchilla

| File | Claim it makes concrete | Headline result |
|---|---|---|
| compute_optimal.py | The compute-optimal basin is flat, so overtraining is nearly free | Shrinking a model to one eighth of the Chinchilla-optimal size costs about 3.5 percent of loss for roughly eight times cheaper serving. |
| emergence_mirage.py | Emergence is largely a metric artifact | A perfectly smooth per-token improvement, scored by exact match over 20 tokens, produces a fake cliff from near zero to 0.49 in one scale step. |

## Honesty notes

All accelerator peaks (990 TFLOP/s, 3.35 TB/s, 900 and 50 GB/s fabrics) are illustrative of an H100 class chip and two fabric tiers. They set the shape of the answer, not a benchmark of any specific product. The model shapes are illustrative of a 70B class dense model.

The FP8 format reach in fp8_bandwidth.py uses the textbook exponent and mantissa arithmetic and ignores the special encoding that lets real FP8 E4M3 reach a max normal of about 448 rather than the 240 the simple formula gives. The point being made, range versus precision and the byte count, is unaffected.

The all reduce model assumes pure data parallelism and the ring algorithm. Real runs combine tensor, pipeline, and expert parallelism, which changes the constant but not the lesson that communication does not shrink when you add GPUs while compute per GPU does.

The tokenizer in tokenizer_fertility.py is a real byte-level BPE trained from scratch, but on a tiny English corpus with a small vocabulary, so the absolute fertility numbers are illustrative. The ordering and the several-times penalty on non-Latin scripts are the robust result, and they follow directly from UTF-8 byte counts.

The MoE and FLOP-breakdown shapes in moe_params.py and attention_vs_ffn_flops.py are illustrative, and the FLOP counting is the standard forward-pass approximation (a multiply-add is 2 FLOPs, linear layers cost twice their parameter count per token).

The loss surface in compute_optimal.py uses the published Chinchilla parametric constants for shape. The absolute loss values are not calibrated to any specific model, and as the experiment notes, the implied tokens-per-parameter ratio drifts with budget rather than sitting at the popular figure of twenty.

The smooth curve in emergence_mirage.py is a chosen logistic, not fitted to data. It exists to demonstrate the metric artifact, that a discontinuous metric manufactures a cliff from a smooth trend, not to claim a specific scale for any real ability.
