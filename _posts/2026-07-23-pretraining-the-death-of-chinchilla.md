---
layout: post
title: "The Death of Chinchilla"
excerpt: "Part 4. Why the most cited recipe in pretraining optimizes the wrong thing, and why emergence is mostly a measurement artifact."
modified: 7/23/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 4 of a six part series. It begins with [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/).*

---

Scaling laws are the closest thing pretraining has to physics. Loss falls as a smooth power law in model size, in data, and in compute, across many orders of magnitude, and that regularity is both reliable and useful. It allows the loss of an untrained model to be predicted from the losses of smaller ones. Most of the rest of pretraining is contested craft, while this part rests on a stable law.

The most cited practical result built on that law, the Chinchilla compute optimal recipe, no longer holds as advice by 2026, though tutorials still repeat it. How it stopped applying, which part of the theory is a measurement artifact, and which real open problem remains once those are set aside, together clarify where models are heading.

---

## The scaling law and the Chinchilla recipe

The early scaling laws came from Kaplan and colleagues. A refined version came from Hoffmann and colleagues at DeepMind, in the Chinchilla paper, which answered a specific question. Given a fixed compute budget, it asked how to divide that budget between making the model bigger and training it on more data. The answer, widely repeated as a rule of thumb, was to scale both together, at roughly twenty tokens of training data per parameter.

The figure below shows the frontier the parametric loss produces, with the optimal model size climbing along a smooth curve as the compute budget grows. The tokens per parameter column reveals the first problem. The ratio climbs with the budget, from about thirty up past a hundred, well above the twenty of the rule of thumb. This reflects the estimation method rather than an error in the experiment. The value of twenty comes from one of the three estimation methods in the Chinchilla paper, while the parametric loss form, drawn from a different method in the same paper, implies a ratio that moves with scale. The paper's own methods disagree with each other. That disagreement matters, because it is an early sign that the optimal ratio was never a constant of nature, which is part of why it proved easy to abandon.

---

## The flat loss basin and inference economics

The main cause is visible directly in the numbers.

Chinchilla optimizes the compute spent to reach a given loss during training. A deployed model spends most of its lifetime compute on inference, answering billions of requests, rather than on the one time training run. The loss surface around the compute optimal point is flat. Holding the budget fixed and shrinking the model below the optimum shows the effect. Cutting the model to one eighth of the optimal size, and training it on eight times the tokens per parameter to spend the same compute, costs about three and a half percent of loss. That gives a model one eighth the size, which is close to one eighth the cost on every forward pass it performs in production.


<iframe class="pf-frame" src="/pretraining/05-scaling-laws.html" title="Interactive figure. The death of Chinchilla" loading="lazy" style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/05-scaling-laws.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


The amortization rests on semiconductor economics. A small, permanent, per request saving multiplied across the entire deployed life of a model outweighs a one time training penalty of a few percent of loss. The rational move is to leave the compute optimal point on purpose, train a smaller model well past the point of training efficiency, and keep the serving savings. This is why the frontier trains small models on very large token counts. The reasoning is closer to amortization than to model quality. A one time training cost is spread against the inference bill across the enormous number of requests the model will serve. Chinchilla answered the training compute question correctly, and then the field stopped asking that question.

A new axis has appeared that did not exist when Chinchilla was written. Test time compute, the reasoning models that generate long chains of thought before answering, buys capability at inference time instead of baking all of it in during pretraining. It partially substitutes for pretraining scale, and it shifts the hardware demand toward the low latency, memory bound serving regime that runs at a fraction of peak throughput. The scaling picture now involves at least three knobs, and the compute optimal recipe only ever described one of them.

---

## Why emergence is mostly a measurement artifact

A second idea in scaling is emergence, the claim that qualitatively new abilities appear suddenly and unpredictably once a model crosses a size threshold. It has been widely reported. It is also, in large part, a measurement artifact, and the effect can be reproduced in a few lines.

The figure below models a per token correctness probability that improves smoothly with scale, with nothing sudden in the ground truth. It then scores that smooth improvement two ways. Per token accuracy climbs steadily from 0.1 to 0.96. Exact match accuracy over a twenty token answer, which requires every token to be right at once, behaves differently. The exact match number stays near zero while per token accuracy is only moderate, then rises from near zero toward one over a single scale step. That rise is the reported emergent ability, and it is a smooth number raised to a high power. Schaeffer and colleagues made this argument in 2023, and the toy model reproduces it. Switching from an all or nothing metric to one that gives partial credit returns the sharp step to the smooth slope underneath.


<iframe class="pf-frame" src="/pretraining/12-emergence-mirage.html" title="Interactive figure. Emergence as a mirage" loading="lazy" style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/12-emergence-mirage.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


The practical guidance that follows is clear. Emergence claims built on a discontinuous metric, which is most of them, deserve caution. A great deal of capability reporting is a hard threshold applied to a smooth underlying trend.

---

## The open problem that remains

Setting aside the outdated recipe and the metric artifact, a real open problem remains, and it is central to the science of pretraining.

The loss is smooth and predictable. The capabilities the loss is meant to represent do not appear smooth. Grokking, the sudden late generalization after a long plateau of apparent memorization, is real, reproducible, and not a metric artifact. Internal reorganizations, circuits forming and features separating, seem to happen in something closer to phases than a smooth glide. The result is a real gap. There is a strong predictive theory for the loss and almost no predictive theory for the abilities it stands in for. The next model's loss can be predicted. What it will be able to do cannot yet be predicted reliably.

That gap is where the open science lies. Predicting downstream capability from upstream loss, understanding which abilities track loss smoothly and which reorganize in steps, and knowing in advance which is which, remains unsolved and central. Emergence as usually reported is a measurement artifact. The underlying point, the mismatch between the smooth theory and the uneven reality of capability, is real, and it remains an open area of understanding rather than a settled law.

---

## Summary

Three points hold together. The Chinchilla recipe no longer applies, set aside because of the flat loss basin and the arithmetic of inference rather than any better law. Emergence, as popularly reported, is mostly an artifact of all or nothing metrics. Underneath both, the gap between predictable loss and unpredictable capability is a live open problem that neither the outdated recipe nor the metric artifact should obscure.

The same pattern appears across pretraining. Even scaling, one of its more scientific areas, turns out on inspection to be governed by inference economics and by the limits of measurement, more than by any clean law about intelligence. The law is real, though it decides less than its reputation suggests.

*Sources and notes are in [references.md](/pretraining/references.md).*

<script>
(function(){
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe.pf-frame'));
  function resize(f){
    try{
      var b = f.contentWindow.document.body;
      if(!b) return;
      // Measure the body content height, not documentElement.scrollHeight. The latter is
      // floored to the iframe viewport, so setting the height back would ratchet upward on
      // every call. body.scrollHeight reflects true content, and the guard below stops any
      // sub-pixel feedback so clicking no longer adds a strip of blank space each time.
      var h = b.scrollHeight;
      if(h && Math.abs(h - (f._h || 0)) > 1){ f.style.height = h + 'px'; f._h = h; }
    }catch(e){}
  }
  frames.forEach(function(f){
    f.addEventListener('load', function(){
      resize(f); setTimeout(function(){resize(f);}, 300);
      ['click','change','input'].forEach(function(ev){
        try{ f.contentWindow.document.addEventListener(ev, function(){ setTimeout(function(){resize(f);}, 90); }); }catch(e){}
      });
    });
  });
  window.addEventListener('resize', function(){ frames.forEach(function(f){ f._h = 0; setTimeout(function(){resize(f);}, 120); }); });
})();
</script>
