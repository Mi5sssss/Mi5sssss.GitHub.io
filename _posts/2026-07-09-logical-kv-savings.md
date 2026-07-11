---
layout: post
title: "Logical KV Savings Are Not Physical Memory Savings"
excerpt: "Token-level KV cache eviction can report large logical savings while returning little usable GPU memory to a paged allocator. How much it actually returns is method dependent. An analytical bound, realistic eviction patterns, allocator-aware metrics, and interactive simulations."
modified: 7/9/2026, 12:00:00
tags: [AI infrastructure, LLM serving, KV cache, computer architecture, memory systems]
comments: true
category: blog
---

## TL;DR

- Paged KV cache runtimes (PagedAttention in vLLM, and the physical-memory variant in vAttention) allocate and free memory in whole blocks or pages. The unit of reuse is a fully free block, not a single dead token.
- Token-level eviction reports savings in *logical* tokens. Whether those become *physical* free blocks depends on where the survivors land, which is method dependent, not universal.
- Under random independent eviction the expected freed-block fraction is `q^B` for block size `B`, so a 50% cut at `B=16` frees on the order of 0.0015% of blocks. That is a worst-case scatter bound, not a prediction of real methods.
- On realistic patterns at a matched 50% retained ratio (30 seeds), zero-copy physical reclaim is high for window-plus-sink eviction (StreamingLLM, 0.47, block coherent), near zero for scattered heavy-hitter eviction (H2O, 0.001), and intermediate for SnapKV (0.29). Heavy-hitter methods either strand memory or force compaction.
- Admission of new requests tracks physically free blocks, not logically deleted tokens. Five strategies with an *identical* 50% logical saving admit 0, 0, 32, 22.6, and 32 new requests.
- Treat KV compression as physical memory management: report reclaimability, prefer block-coherent or reclaimability-aware eviction, and use copy-budgeted compaction only when its bandwidth cost is affordable. The charts below are interactive.

## The claim

KV cache compression is usually reported with model-side metrics: retained-token ratio, compression ratio, and task accuracy. Those are necessary but they never observe the allocator's free list. In a paged runtime, memory returns to service only when an entire block is empty, so a block that keeps even one live token cannot be reused.

This is not a new observation. KV-Compress states directly that variable-rate head eviction "adds fragmentation and cannot realize the theoretical compression rates in physical memory," and fixes it by evicting whole blocks inside PagedAttention; vAttention reclaims physical pages under a contiguous virtual layout. What this post adds is a compact analytical bound, a set of allocator-aware metrics, and reproducible simulations that measure how much logical saving becomes physical reclaim across *realistic* eviction patterns. It is analytical and simulation-based. It does not measure a production runtime, it does not model attention kernels, and it says nothing about whether an eviction rule preserves output quality. It isolates one mechanism: the granularity mismatch between fine-grained token eviction and coarse-grained block allocation.

## Logical deletion versus physical reclaim

**Logical deletion** is a bookkeeping change: a token is masked or dropped from attention. **Physical reclaim** is the event that changes serving capacity: a complete block returns to the free list. The first does not imply the second. A dead token in an otherwise-live block is stranded capacity, not free capacity.

With `B` tokens per block and eviction ratio `q`, random independent eviction frees a block only when all `B` of its tokens are gone:

- `logical_saving = q`
- `physical_reclaim = q^B`
- `reclaim_efficiency = q^(B-1)`

At `B=16`, a 50% cut yields `0.5^16 ≈ 0.0015%` physical reclaim and a 75% cut about 1.0%. This `q^B` curve is the worst case: it assumes survivors are scattered independently. It is a lower bound on what a real method achieves, not a description of one.

![Logical saving versus physical block reclaim](/kv-reclaimability/figures/fig1_logical_vs_physical_reclaim.png)

*Logical saving is the diagonal. Physical reclaim (`q^B`) hugs zero until the eviction ratio is high, and the knee sharpens as the block grows.*

## Reclaimability is method dependent

The interesting question is not the worst case but where real methods sit. Simulating three deployed eviction shapes at a matched 50% retained ratio, `B=16`, over 30 seeds, and measuring zero-copy physical reclaim, the fraction of blocks fully evicted at eviction time:

- **StreamingLLM** (contiguous attention-sink prefix plus a contiguous recent window): reclaim **0.47 ± 0.02**, moving only 0.6% of survivors. Its holes are one contiguous middle region, so it is block coherent and already allocator friendly.
- **SnapKV** (a clustered recent selection): reclaim **0.29 ± 0.04**, intermediate.
- **H2O** (scattered heavy hitters plus a recent window): reclaim **0.001 ± 0.005**. Heavy hitters sit in almost every old block, so almost nothing frees. This is the danger case.
- **Random** independent: reclaim **0.000**, the worst-case bound.

![Physical reclaim by realistic eviction method](/kv-reclaimability/figures/fig9_realistic_method_reclaim.png)

*Zero-copy physical reclaim at a matched retained ratio. Window-plus-sink eviction is block coherent and reclaims memory for free. Scattered heavy-hitter eviction strands memory.*

The direction matters, and it is the opposite of the naive intuition that more aggressive importance-based eviction frees the most memory. It also worsens with block size: as `B` grows from 4 to 64, StreamingLLM stays near 0.47 while H2O falls from 0.14 to 0.00, because larger blocks make a single scattered survivor strand more capacity.

![Reclaim versus block size by method](/kv-reclaimability/figures/fig10_realistic_reclaim_vs_blocksize.png)

Scattered methods have not lost the memory permanently. They hold reclaim that is unlockable only by paying compaction copy cost, quantified below.

## Importance geometry decides the strategy gap

Whether importance-based eviction strands memory depends on how spatially clustered the low-importance tokens are. Sweeping a spatial-correlation knob `rho` from 0 (importance independent of position) to 1 (low-importance tokens contiguous), lowest-importance token eviction goes from freeing **0.000** of blocks to **0.465**, and its gap to whole-block eviction shrinks from **0.50** to **0.035**.

![Spatial-correlation sensitivity](/kv-reclaimability/figures/fig11_spatial_correlation_sensitivity.png)

*As low-value tokens cluster, token-level eviction starts to look block coherent and the reason to prefer block-wise eviction fades. The strong version of the problem exists only when importance is spatially scattered.*

## Strategy and the quality tradeoff

Holding the logical budget fixed and varying only geometry (lognormal importance, `q=0.5`, 30 seeds): random token eviction frees 0.0 of blocks at 50% importance loss; lowest-importance eviction frees 0.0 at only 16% loss; whole-block eviction frees 0.50 at efficiency 1.0 but 38% loss; a reclaimability-aware policy that optimizes quality loss per reclaimed block frees 0.36 at 28% loss, sitting on the favorable interior of the tradeoff.

## Admission tracks free blocks, not tokens

Starting from a full block pool, applying an identical 50% logical eviction, and admitting new requests that each need eight free blocks, the number admitted depends entirely on how many *whole* blocks came free.

![New-request admission after eviction](/kv-reclaimability/figures/fig8_new_request_admission.png)

*Every bar has the same 50% logical saving. Random and lowest-importance token eviction admit zero. Whole-block eviction admits the naive expectation of 32. Reclaimability-aware admits 22.6. Random-plus-compaction recovers the full 32 by moving about 1,649 survivor tokens, a bandwidth cost the runtime must budget for.*

## Explore it

Hover any point or bar for exact values with one standard deviation, click a legend entry to hide a series, switch the importance distribution in the strategy section, and toggle the log axes. The page runs top to bottom through the `q^B` bound, the realistic methods, eviction strategy, the spatial-correlation sensitivity, compaction cost, and request admission.

<iframe id="kvreclaim" src="/kv-reclaimability/" title="Interactive figures for logical versus physical KV savings"
        style="width:100%; height:9200px; border:1px solid #ddd; border-radius:8px;" loading="lazy"></iframe>

<p><a href="/kv-reclaimability/" target="_blank" rel="noopener">Open the interactive page in a new tab</a></p>

<script>
(function () {
  var f = document.getElementById('kvreclaim');
  if (!f) return;
  function resize() {
    try {
      var b = f.contentWindow.document.body;
      if (!b) return;
      // body.scrollHeight reflects true content height and is not floored to the iframe
      // viewport, so setting the height back does not ratchet upward. The guard stops any
      // sub-pixel feedback, so clicking no longer adds a strip of blank space each time.
      var h = b.scrollHeight;
      if (h && Math.abs(h - (f._h || 0)) > 1) { f.style.height = h + 'px'; f._h = h; }
    } catch (e) { /* cross-origin only, ignored on the live same-origin site */ }
  }
  f.addEventListener('load', function () {
    resize();
    setTimeout(resize, 300);
    try { f.contentWindow.document.addEventListener('click', function () { setTimeout(resize, 80); }); } catch (e) {}
    try { f.contentWindow.document.addEventListener('change', function () { setTimeout(resize, 80); }); } catch (e) {}
  });
  window.addEventListener('resize', function () { f._h = 0; setTimeout(resize, 120); });
})();
</script>

## Compaction is the missing systems operation, and it has a cost

When eviction must stay fine-grained, the runtime can still reclaim memory by moving survivors into fewer blocks and freeing the emptied ones, which is garbage collection with a compacting collector applied to KV memory. The honest way to score it is reclaimed capacity per token moved, on the increment that compaction actually frees. Random eviction reclaims about 2.48 blocks-worth of space per moved token and needs thousands of moves to free the pool; clustered holes reclaim about 6.65 per move; block-coherent eviction needs no copy at all because it already freed its blocks at eviction time.

![Compaction reclaim per moved token](/kv-reclaimability/figures/fig6_compaction_reclaim_per_move.png)

I deliberately do not headline the total-to-minimal ratio, which looks like thousands for clustered layouts only because it credits compaction with blocks that were already free. And the per-token figure is a bandwidth-only lower bound on cost: it omits block-table and position-metadata updates, kernel disruption, synchronization, and the rotary re-embedding that moved KV requires. A usable compactor must be copy-budgeted and latency-aware.

![Compaction copy cost by method](/kv-reclaimability/figures/fig12_realistic_compaction_cost.png)

## Better metrics

If you evaluate KV compression, report the allocator-aware quantities alongside the model-side ones: physical blocks reclaimed, reclaim efficiency (`physical_memory_reclaimed / logical_memory_removed`), fragmentation (`1 - live_tokens / (nonempty_blocks * B)`), moved tokens per reclaimed block, and useful new requests admitted. A method that cuts retained-token ratio without growing the free list has not improved serving concurrency.

## What the simulation does and does not prove

It proves an accounting fact: under the paged block model, physical reclaim and admission are governed by block occupancy, and fine-grained eviction frees blocks only when its survivors are block aligned or when it pays for compaction. It does not prove a production speedup, it does not quantify kernel or bandwidth effects, and it does not establish model quality. The importance scores and the three method shapes are synthetic proxies calibrated to the geometry of the real methods, not runs of the real methods. The next step that would turn this into evidence is running H2O, SnapKV, and StreamingLLM in a paged runtime and reporting free blocks and admitted requests at matched quality.

## How it was made

Every number comes from a deterministic simulation with a fixed seed, 30 replications, and mean plus or minus one standard deviation on every stochastic figure, using numpy, pandas, and matplotlib only. The script sweeps block size 4 to 64, retained ratio, and the spatial-correlation knob, and writes the static figures, `results_summary.csv`, and the `interactive_data.json` that drives the charts, so the interactive values match the figures exactly.

## Red team, six loops

- **Novelty.** The physical-realization point is already made by KV-Compress and vAttention. This post is a reproducible mechanism study and metric proposal, not a new claim.
- **Realism.** The corrected message is that reclaimability is method dependent: window-plus-sink eviction is high and block coherent, scattered heavy-hitter eviction is low and strands or forces compaction, SnapKV is intermediate. The `q^B` model is a worst-case scatter bound, not a prediction.
- **Baselines.** Random independent eviction is kept only as a labeled worst-case bound; StreamingLLM is the strong allocator-friendly comparator.
- **Isolation.** Strategies hold the logical budget fixed and vary only geometry, and a separate `rho` sweep isolates importance geometry from everything else.
- **Statistics.** 30 seeds, mean and standard deviation, error bars on every stochastic figure, plus a block-size sweep so the headline does not rest on `B=16` alone.
- **Honesty of metrics.** The delta reclaim-per-move replaces the inflated total-to-minimal ratio, and moved tokens are stated as a bandwidth-only lower bound that omits metadata, kernel, synchronization, and rotary re-embedding costs.

## References

- [PagedAttention] Kwon et al. Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP 2023. arXiv 2309.06180.
- [FlashAttention] Dao, Fu, Ermon, Rudra, Ré. Fast and Memory-Efficient Exact Attention with IO-Awareness. NeurIPS 2022. arXiv 2205.14135.
- [KV-Compress] Rehg. Paged KV-Cache Compression with Variable Compression Rates per Attention Head. 2024. arXiv 2410.00161.
- [vAttention] Prabhu et al. Dynamic Memory Management for Serving LLMs without PagedAttention. ASPLOS 2025. arXiv 2405.04437.
- [H2O] Zhang et al. Heavy-Hitter Oracle for Efficient Generative Inference of Large Language Models. NeurIPS 2023. arXiv 2306.14048.
- [StreamingLLM] Xiao et al. Efficient Streaming Language Models with Attention Sinks. ICLR 2024. arXiv 2309.17453.
- [SnapKV] Li et al. SnapKV: LLM Knows What You are Looking for Before Generation. 2024. arXiv 2404.14469.
- [Ada-KV] Feng et al. Optimizing KV Cache Eviction by Adaptive Budget Allocation for Efficient LLM Inference. 2024. arXiv 2407.11550.
- [GMLake] Guo et al. Efficient and Transparent GPU Memory Defragmentation for Large-scale DNN Training with Virtual Memory Stitching. ASPLOS 2024. doi 10.1145/3620665.3640423.
