---
layout: post
title: "Logical KV Savings Are Not Physical Memory Savings"
excerpt: "Token-level KV cache eviction can report large logical savings while returning almost no usable GPU memory to a paged allocator. An analytical model, allocator-aware metrics, and interactive simulations."
modified: 7/9/2026, 12:00:00
tags: [AI infrastructure, LLM serving, KV cache, computer architecture, memory systems]
comments: true
category: blog
---

## TL;DR

- Paged KV cache runtimes (PagedAttention in vLLM, and the physical-memory variant in vAttention) allocate and free memory in whole blocks or pages. The unit of reuse is a fully free block, not a single dead token.
- Token-level eviction and compression report savings in *logical* tokens. If the survivors are scattered across blocks, almost no blocks become free, so the *physical* footprint barely moves.
- The gap is quantifiable. Under random scattered eviction the expected freed-block fraction is `q^B` for block size `B`, so a 50% token cut at `B=16` frees on the order of 0.0015% of blocks.
- Admission of new requests tracks physically free blocks, not logically deleted tokens. In one simulation, five strategies with an *identical* 50% logical saving admit 0, 0, 32, 22, and 32 new requests.
- The fix is to treat KV compression as physical memory management: measure reclaimability, prefer block-coherent or reclaimability-aware eviction, and add copy-budgeted compaction. The charts below are interactive.

## The claim

KV cache compression is usually reported with model-side metrics: retained-token ratio, compression ratio, and task accuracy. Those are necessary but they never observe the allocator's free list. In a paged runtime, memory returns to service only when an entire block is empty. A compression method can remove a large fraction of tokens and still return almost nothing to the allocator, because a block that keeps even one live token cannot be reused.

This is not an entirely new observation. The KV-Compress work states directly that variable-rate head eviction "adds fragmentation and cannot realize the theoretical compression rates in physical memory," and fixes it by evicting whole blocks inside PagedAttention. What this post adds is a compact analytical model of the gap, a small set of allocator-aware metrics, and reproducible simulations that make the mechanism visible. It is analytical and simulation-based. It does not measure a production runtime, it does not model attention kernels, and it says nothing about whether any eviction rule preserves output quality. It isolates one mechanism: the granularity mismatch between fine-grained token eviction and coarse-grained block allocation.

## Logical deletion versus physical reclaim

**Logical deletion** is a bookkeeping change. A policy decides a token no longer participates in attention and masks or drops its KV entry. **Physical reclaim** is the event that changes serving capacity: a complete block returns to the free list and can back another request. The first does not imply the second. A dead token sitting in an otherwise-live block is stranded capacity, not free capacity.

The analytical model makes this precise. With `B` tokens per block and eviction ratio `q`, random independent eviction frees a block only when all `B` of its tokens are gone:

- `logical_saving = q`
- `physical_reclaim = q^B`
- `reclaim_efficiency = q^(B-1)`

At `B=16`, a 50% cut yields `0.5^16 ≈ 0.0015%` physical reclaim; a 75% cut yields about 1.0%. Physical reclaim only becomes comparable to logical saving when eviction is very aggressive or blocks are very small.

![Logical saving versus physical block reclaim](/kv-reclaimability/figures/fig1_logical_vs_physical_reclaim.png)

*Logical saving is the diagonal. Physical reclaim (`q^B`) hugs zero until the eviction ratio is high, and the knee sharpens as the block grows. Scattered eviction converts almost none of its logical saving into free blocks at production block sizes.*

## Strategy decides reclaim, and it trades off against quality

Holding the logical budget fixed, the eviction *strategy* decides whether logical removal becomes physical reclaim. Removing the globally lowest-importance tokens minimizes quality loss but frees essentially no blocks, because low-value tokens are scattered. Evicting whole low-value blocks frees memory efficiently but discards some mid-value tokens to clear a block. A reclaimability-aware policy that optimizes quality loss per *reclaimed block* sits between the two, capturing most of the reclaim at a fraction of the extra quality cost. The interactive tradeoff chart below makes this frontier explicit and lets you switch the importance distribution.

## Admission tracks free blocks, not tokens

The practical consequence shows up at admission time. Starting from a full block pool, applying an identical 50% logical eviction, and admitting new requests that each need several free blocks, the number admitted depends entirely on how many *whole* blocks came free.

![New-request admission after eviction](/kv-reclaimability/figures/fig8_new_request_admission.png)

*Every bar has the same 50% logical saving. Random and lowest-importance token eviction admit zero new requests. Block-wise eviction and random-plus-compaction reach the naive expectation of 32. Reclaimability-aware admits 22. Compaction recovers the full count by moving about 1,645 survivor tokens, which is a bandwidth cost the runtime must budget for.*

## Explore it

Hover any point or bar for exact values, click a legend entry to hide a series, switch the importance distribution in tab 2, and toggle log axes in tab 1. Four tabs: the `q^B` gap, eviction strategy, compaction cost, and request admission.

<iframe id="kvreclaim" src="/kv-reclaimability/" title="Interactive figures for logical versus physical KV savings"
        style="width:100%; height:1600px; border:1px solid #ddd; border-radius:8px;" loading="lazy"></iframe>

<p><a href="/kv-reclaimability/" target="_blank" rel="noopener">Open the interactive page in a new tab</a></p>

<script>
(function () {
  var f = document.getElementById('kvreclaim');
  if (!f) return;
  function resize() {
    try {
      var doc = f.contentWindow.document.documentElement;
      f.style.height = (doc.scrollHeight + 24) + 'px';
    } catch (e) { /* cross-origin only, ignored on the live same-origin site */ }
  }
  f.addEventListener('load', function () {
    resize();
    setTimeout(resize, 300);
    try { f.contentWindow.document.addEventListener('click', function () { setTimeout(resize, 80); }); } catch (e) {}
    try { f.contentWindow.document.addEventListener('change', function () { setTimeout(resize, 80); }); } catch (e) {}
  });
  window.addEventListener('resize', function () { setTimeout(resize, 120); });
})();
</script>

## Compaction is the missing systems operation, and it has a cost

If eviction has to stay fine-grained for quality reasons, the runtime can still reclaim memory by moving survivors into fewer blocks and freeing the emptied ones. This is garbage collection with a compacting collector, applied to KV memory. The copy cost depends on how scattered the survivors are: random eviction needs thousands of token moves to free the same blocks that block-coherent eviction frees for free. GPU training runtimes already defragment memory with virtual-memory stitching, and vAttention defers physical reclamation as an optimization; a KV compactor is the cache-level analogue. The compaction tab shows reclaimed-per-copied ROI and the raw copy bill side by side.

## Better metrics

If you evaluate KV compression, report the allocator-aware quantities alongside the model-side ones: physical blocks reclaimed, reclaim efficiency (`physical_memory_reclaimed / logical_memory_removed`), fragmentation (`1 - live_tokens / (nonempty_blocks * B)`), and useful new requests admitted. A method that reduces retained-token ratio without growing the free list has not improved serving concurrency.

## What the simulation does and does not prove

It proves an accounting fact: under the paged block model, physical reclaim and admission are governed by block occupancy, and fine-grained eviction generically fails to free blocks unless it is block-aware or followed by compaction. It does not prove a production speedup, it does not quantify kernel or bandwidth effects, and it does not establish model quality. The importance scores are synthetic proxies. The next step that would turn framing into evidence is running real eviction methods (H2O, SnapKV, and similar) in a paged runtime and reporting free blocks and admitted requests at matched quality.

## How it was made

Every number here comes from a small, deterministic simulation with a fixed seed, using numpy, pandas, and matplotlib only. The script writes the static figures, `results_summary.csv`, and the `interactive_data.json` that drives the charts above, so the interactive values match the figures exactly. Importance is modeled with uniform, lognormal, and Pareto distributions to vary how skewed token value is; it is not spatially correlated with block position, which is the honest default.

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
