---
layout: post
title: "Why a Busy GPU Is Not a Useful GPU in LLM Serving"
excerpt: "A reproducible mechanism study of schedulability, KV-cache lifecycle, and useful tokens per dollar in LLM serving, with a controlled scheduler ablation and honest error bars."
modified: 7/9/2026, 00:00:00
tags: [AI infrastructure, LLM serving, computer architecture, scheduling]
comments: true
category: blog
---

## TL;DR

- This post is a synthesis with reproducible mechanism simulations, not a new claim. That per-GPU goodput under an SLO diverges from raw throughput is the established DistServe result, and the physical realization of the KV cache is the subject of PagedAttention, vAttention, and KV-Compress. What I add is a controlled, seed-averaged decomposition of where those classic systems ideas bend under an irregular token stream.
- Continuous (iteration level) batching helps, but against an honest baseline the margin is modest. At rate 5 it delivers about 1.23 times the throughput of a right-sized dynamic batcher (95 percent CI about 0.04), and 3.64 times a naive run-to-slowest static batcher that I keep only as a labeled reference.
- KV-cache lifetime, not model weight size, gates concurrency here. Compression admits more work, but it is a tradeoff, not a free win: once a quality penalty and a merge cost are charged, compression trails a plain reject baseline on useful tokens per unit of compute, and it stops winning on total useful output past a penalty near 0.4.
- A busy GPU is not a useful GPU. Holding speculation depth equal, a value-aware scheduler delivers about 4.2 times the useful tokens of a utilization maximizer (95 percent CI about 0.16). A one-lever ablation shows that dropping doomed requests is almost the entire effect; value-ordering and speculation depth are secondary.
- Every number comes from twelve seeded replications with confidence intervals on the headline ratios. The cost, quality, and value models are abstract proxies, clearly labeled, not measurements. The charts below are interactive.

## What is and is not new

Most techniques that look new in AI infrastructure re-express old systems ideas: caching, batching, paging, pipelining, speculation, and compression. Continuous batching is iteration-level scheduling (Orca). Paged KV is operating-system paging (PagedAttention, vAttention). KV compression by dropping or merging tokens is the subject of H2O, StreamingLLM, and SnapKV. That per-GPU goodput under a latency target diverges from raw throughput is the central result of DistServe. None of that is new here.

What this post contributes is narrow and reproducible: three small mechanism simulations, averaged over twelve seeds with error bars, that isolate one variable at a time and report honest magnitudes with confidence intervals. Where an earlier draft headlined an inflated gap against a strawman, this version demotes the strawman to a reference and reports the gap against a defensible baseline.

## Experiment 1: batching against an honest baseline

Continuous batching admits new work every decode step. The earlier draft compared it only against a naive static batcher that pads every request to the slowest member of its batch and coalesces only within a window of the oldest arrival. That baseline is weak, and beating it by 3.6 times mostly measures the strawman.

So I added a right-sized dynamic batcher: it forms a full cohort from the current backlog, returns each request as soon as it individually finishes, and scales decode cost with the still-active set. Its only remaining handicap against continuous batching is the lack of mid-flight admission, so a straggler holds its slot until the cohort drains.

At rate 5 requests per second, continuous batching sustains 4.94 completed requests per second, the right-sized batcher 4.04, and naive static 1.36. The honest headline is continuous over right-sized, about 1.23 times (95 percent CI 0.04), widening to about 1.6 times at rate 7 as the cohort barrier bites. Continuous over naive static is 3.64 times (CI 0.09), reported only as a reference. Mean end-to-end latency at rate 5 is about 2.4 simulated seconds for continuous, 35 for right-sized, and 377 for naive static. And continuous batching does not repeal queueing theory: its P99 still climbs from about 5.9 to 25.7 across the load sweep.

![Throughput and latency for three batchers](/llm-serving-schedulability/figures/exp1_throughput_latency.png)

*Continuous keeps scaling, the right-sized batcher saturates at its cohort barrier, and naive static is a flat reference. Mean latency is on a log axis.*

## Experiment 2: KV cache lifecycle and the cost of compression

Here a fixed key-value capacity is the only binding constraint and model weights are excluded on purpose, so concurrency is gated by key-value lifetime rather than model size. Three policies handle capacity pressure: reject when full, evict the lowest-value resident, or compress old KV.

Compression is not a free win. Dropping or merging KV loses information, so I charge two abstract proxies: a quality penalty that scales down the useful output of any request whose KV was compressed, and a compute cost for the merge itself. I also tightened the service-level target and swept it, so useful tokens per unit compute now discriminates across all three policies rather than only flattering eviction.

At the base target and a 0.35 quality penalty, compression still leads on raw useful tokens, 23.2k against 21.7k for reject, a ratio of 1.08 (95 percent CI 0.03). But per unit of compute the order flips: reject delivers 0.62 useful tokens per unit compute, eviction 0.53, and compression only 0.35. Sweeping the penalty shows where compression stops winning on total useful output: it beats reject below a penalty of roughly 0.4 and falls behind above it. Compression buys concurrency and pays in quality and compute, and whether that trade is worth it depends on how lossy the method is.

![Compression tradeoff](/llm-serving-schedulability/figures/exp2_tradeoff.png)

*Left: useful tokens per unit compute separates all three policies across SLA targets. Right: compression beats reject on useful output only below a penalty near 0.4.*

## Experiment 3: a busy GPU is not a useful GPU, decomposed

An earlier draft compared a utilization maximizer against a value scheduler that differed in three ways at once, which made the large headline uninterpretable. This version holds speculation depth equal for the headline and then toggles exactly one lever at a time.

With speculation depth fixed, the value-aware scheduler (drop doomed requests, admit by value) delivers 88.3 useful tokens per step against 21.1 for the utilization maximizer, a ratio of 4.2 times (95 percent CI 0.16), at nearly identical utilization, 0.98 against 0.99. It also delivers about 6.4 times the useful value per unit compute and about half the SLA violation rate, 0.46 against 0.61. I also fixed an accounting bug so the violation-rate denominator now counts every request once, completed, cancelled, or expired, identically in both schedulers.

The decomposition is the point. Starting from the busy baseline at 21.1 useful tokens per step:

- Dropping doomed requests alone lifts it to 105.7, almost the entire gap.
- Value-ordering alone lowers it to 15.6. Prioritizing high-value requests trades raw token count for delivered value; on its own, without dropping doomed work, it does not raise token throughput.
- Right-sizing speculation depth alone lifts it modestly to 23.3, by freeing slots that aggressive drafting had consumed.
- All three together reach 105.3, essentially matching drop-doomed alone.

So the honest mechanism is not that value awareness is magic. It is that a utilization maximizer keeps doomed requests on the device, and refusing to spend compute on work that no user will accept is what recovers goodput. Value-ordering then reallocates the recovered goodput toward higher-value requests, which is why it lifts delivered value per unit compute even as it slightly lowers the raw token count.

![Goodput decomposition](/llm-serving-schedulability/figures/exp3_ablation.png)

*One lever at a time from the busy baseline, at equal speculation unless noted. Drop-doomed dominates.*

## Explore it

Hover any point or bar for exact values with one standard deviation, click a legend entry to hide or show a series, switch the latency metric between mean, P95, and P99, and flip the latency axis between linear and log.

<iframe id="llmserve" src="/llm-serving-schedulability/" title="Interactive figures for LLM serving"
        style="width:100%; height:9200px; border:1px solid #ddd; border-radius:8px;" loading="lazy"></iframe>

<p><a href="/llm-serving-schedulability/" target="_blank" rel="noopener">Open the interactive page in a new tab</a></p>

<script>
(function () {
  var f = document.getElementById('llmserve');
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

## Key results at a glance

- Batching at rate 5. Continuous 4.94, right-sized 4.04, naive static 1.36 requests per second. Continuous over right-sized 1.23 times (CI 0.04); over naive static 3.64 times (CI 0.09), reference only. Continuous P99 grows from about 5.9 to 25.7 across the sweep.
- KV cache pressure at the base target and a 0.35 penalty. Useful tokens compress 23.2k, reject 21.7k, evict 17.8k. Useful per unit compute reject 0.62, evict 0.53, compress 0.35. Compression stops beating reject on useful output above a penalty near 0.4.
- Utilization vs useful tokens at equal speculation. Useful tokens per step 88.3 against 21.1, a ratio of 4.2 times (CI 0.16). Utilization 0.98 against 0.99. Useful value per unit compute about 6.4 times. SLA violations 0.46 against 0.61. Ablation useful tokens per step: baseline 21.1, drop-doomed 105.7, value-order 15.6, right-sized speculation 23.3.

## How it was made

These are simulations of mechanisms, not measurements from real GPUs. The cost, quality, and value models are abstract proxies, clearly labeled as such, not benchmarks. They run on numpy, pandas, and matplotlib with no other dependencies, and report means over twelve seeded replications, with sample standard deviations and 95 percent confidence intervals on the headline ratios in results_summary.csv. The two time-series panels, utilization over time and KV occupancy over time, are shown for a single representative seed and labeled as such; every bar and ratio summary is seed-averaged with error bars. The whole run is deterministic from one master seed, and the interactive charts read the same aggregated data that produced the static figures.

## Red team appendix: six loops

This artifact was revised through six adversarial passes. Each is recorded here with the change it produced.

1. Novelty. Nothing here is a new result. Change: reframed as a reproducible mechanism study and synthesis, and stated plainly that goodput is not throughput is DistServe, and that physical KV realization is the subject of PagedAttention, vAttention, and KV-Compress.
2. Realism of the model. Change: replaced the strawman static batcher as the headline with a right-sized dynamic batcher, and added a compression quality penalty and a merge cost drawn from how H2O, StreamingLLM, and SnapKV trade accuracy for memory.
3. Baselines. Change: demoted naive static to a labeled reference and reported continuous against the right-sized baseline, about 1.23 times rather than 3.64 times.
4. Isolation. Change: in the scheduler study, held speculation depth equal and toggled one lever at a time, attributing the goodput gap to drop-doomed, value-order, and speculation depth separately.
5. Statistics. Change: raised replications to twelve seeds, reported 95 percent confidence intervals on every headline ratio, and marked the single-seed time-series panels as such.
6. Honesty of metrics. Change: tightened and swept the SLA so useful tokens per compute discriminates across all policies, made compression pay a quality and compute cost, and fixed the SLA-violation denominator so it counts every request once in both schedulers.

## References

- [FlashAttention] Dao, Fu, Ermon, Rudra, Ré. Fast and Memory-Efficient Exact Attention with IO-Awareness. NeurIPS 2022. arXiv 2205.14135.
- [Orca] Yu, Jeong, Kim, Kim, Chun. A Distributed Serving System for Transformer-Based Generative Models. OSDI 2022.
- [PagedAttention] Kwon et al. Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP 2023. arXiv 2309.06180.
- [vAttention] Prabhu et al. Dynamic Memory Management for Serving LLMs without PagedAttention. arXiv 2405.04437.
- [KV-Compress] Rehg. Paged KV-Cache Compression with Variable Compression Rates per Attention Head. arXiv 2410.00161.
- [Sarathi-Serve] Agrawal et al. Taming Throughput-Latency Tradeoff in LLM Inference. OSDI 2024. arXiv 2403.02310.
- [DistServe] Zhong et al. Disaggregating Prefill and Decoding for Goodput-optimized Serving. OSDI 2024. arXiv 2401.09670.
- [Speculative decoding] Leviathan, Kalman, Matias. Fast Inference from Transformers via Speculative Decoding. ICML 2023. arXiv 2211.17192.
- [H2O] Zhang et al. Heavy-Hitter Oracle for Efficient Generative Inference of Large Language Models. arXiv 2306.14048.
- [StreamingLLM] Xiao et al. Efficient Streaming Language Models with Attention Sinks. arXiv 2309.17453.
- [SnapKV] Li et al. SnapKV, LLM Knows What You Are Looking For Before Generation. arXiv 2404.14469.
