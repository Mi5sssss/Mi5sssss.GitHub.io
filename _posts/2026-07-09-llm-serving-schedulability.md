---
layout: post
title: "Why a Busy GPU Is Not a Useful GPU in LLM Serving"
excerpt: "An interactive study of schedulability, KV-cache lifecycle, and useful tokens per dollar, with reproducible simulations."
modified: 7/9/2026, 00:00:00
tags: [AI infrastructure, LLM serving, computer architecture, scheduling]
comments: true
category: blog
---

## TL;DR

- Classic systems ideas still power LLM serving. PagedAttention is operating-system paging, FlashAttention is tiling over the memory hierarchy, speculative decoding is processor speculative execution, and continuous batching is iteration-level scheduling. What changed is where these ideas break under a dynamic, irregular token stream.
- Schedulability behaves as a first-class resource, because arrival time, unknown output length, KV-cache lifetime, and the prefill versus decode gap together decide whether the GPU stays fed under a latency target.
- The token, not the tensor, is the honest unit for accounting cost and value across steps.
- Useful tokens per dollar under a latency target beats raw GPU utilization. In one simulation two schedulers sit near 99 percent utilization yet differ about five times in useful tokens delivered.
- Every number here comes from small reproducible simulations with fixed seeds and error bars. The charts below are interactive, so hover for values and toggle series.

## The argument in three claims

Most techniques that look new in AI infrastructure re-express old systems ideas such as caching, batching, paging, pipelining, speculation, and compression. The new part is the failure boundary that the LLM workload imposes, because the request stream is dynamic and irregular, each request carries key-value state that grows during service, and prefill differs from decode in its resource profile. The serving runtime therefore spends most of its effort turning an irregular token stream into regular hardware work.

**Schedulability is the bottleneck.** Continuous (iteration level) batching turns the batch from a fixed tile into a control surface that the scheduler adjusts every step. In the simulation at rate 5 requests per second it sustains about 4.9 completed requests per second against 1.4 for static batching, and mean latency drops to roughly 2.3 from 373 simulated seconds. The honest half is the tail, since continuous P99 still climbs about four times as arrivals approach capacity.

**The token is the right accounting unit.** With a fixed key-value capacity as the only binding constraint, and model weights fitting comfortably, the reject policy still turns away 294 of 500 requests from key-value pressure alone. Concurrency is gated by key-value lifetime, not by model size. Compression converts rejected work into useful work and delivers about 1.49 times the useful tokens of rejection, while eviction by value discards already spent compute and ends up below rejection on useful tokens per unit compute.

**A busy GPU is not a useful GPU.** Two schedulers run near the same utilization, 0.996 against 0.956, and the utilization maximizer even processes more positions per step. Yet it delivers about 19 useful tokens per step against 105 for the value-aware scheduler, roughly five and a half times fewer, at eight times lower useful value per unit compute, with 58 percent latency-target violations against 28 percent. This is the mechanism behind the goodput idea from recent serving research.

![Utilization versus useful work](/llm-serving-schedulability/figures/exp3_utilization_vs_useful.png)

*Both schedulers stay near full utilization, and the utilization maximizer even processes slightly more positions per step, yet its useful tokens per step are about one fifth of the value-aware scheduler.*

## Explore it

Hover any point or bar for exact values with one standard deviation, click a legend entry to hide or show a series, switch the latency metric between mean, P95, and P99, and flip the latency axis between linear and log.

<iframe id="llmserve" src="/llm-serving-schedulability/" title="Interactive figures for LLM serving"
        style="width:100%; height:1500px; border:1px solid #ddd; border-radius:8px;" loading="lazy"></iframe>

<p><a href="/llm-serving-schedulability/" target="_blank" rel="noopener">Open the interactive page in a new tab</a></p>

<script>
(function () {
  var f = document.getElementById('llmserve');
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
  });
  window.addEventListener('resize', function () { setTimeout(resize, 120); });
})();
</script>

## Key results at a glance

- Continuous vs static batching at rate 5. Throughput 4.9 against 1.4 requests per second. Mean latency 2.3 against 373 simulated seconds. Continuous P99 grows from 5.7 to 23.9 across the load sweep.
- KV cache pressure. Reject turns away 294 of 500 requests. Compression delivers 51.9k useful tokens against 34.8k for reject. Eviction by value delivers 27.9k and drops useful tokens per unit compute to 0.85.
- Utilization vs useful tokens. Utilization 0.996 against 0.956. Useful tokens per step 19.0 against 104.8. Useful value per unit compute higher by about eight times. Wasted-token ratio 91 percent against 33 percent.

## How it was made

These are simulations of mechanisms, not measurements from real GPUs. They use abstract cost models so the systems mechanism stays visible, run on numpy, pandas, and matplotlib with no other dependencies, and report means with one standard deviation over five seeded replications. The whole run is deterministic from a single master seed, and the interactive charts read the same aggregated data that produced the static figures.

## References

- [FlashAttention] Dao, Fu, Ermon, Rudra, Ré. Fast and Memory-Efficient Exact Attention with IO-Awareness. NeurIPS 2022. arXiv 2205.14135.
- [Orca] Yu, Jeong, Kim, Kim, Chun. A Distributed Serving System for Transformer-Based Generative Models. OSDI 2022.
- [PagedAttention] Kwon et al. Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP 2023. arXiv 2309.06180.
- [Sarathi-Serve] Agrawal et al. Taming Throughput-Latency Tradeoff in LLM Inference. OSDI 2024. arXiv 2403.02310.
- [DistServe] Zhong et al. Disaggregating Prefill and Decoding for Goodput-optimized Serving. OSDI 2024. arXiv 2401.09670.
- [Speculative decoding] Leviathan, Kalman, Matias. Fast Inference from Transformers via Speculative Decoding. ICML 2023. arXiv 2211.17192.
