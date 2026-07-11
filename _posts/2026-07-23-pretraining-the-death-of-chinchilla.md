---
layout: post
title: "The Death of Chinchilla"
excerpt: "Part 4. Why the most cited recipe in pretraining optimizes the wrong thing, and why emergence is mostly a measurement artifact."
modified: 7/23/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 4 of the series. The hub is [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). This post goes deep on scaling, the one part of pretraining with a real quantitative theory, and shows where that theory is dead, where it is a mirage, and where it hides the deepest open problem in the field. The numbers are all explorable in the interactive figures below.*

---

Scaling laws are the closest thing pretraining has to physics. Loss falls as a smooth power law in model size, in data, and in compute, across many orders of magnitude, and that regularity is genuinely astonishing and genuinely useful. It is why you can predict the loss of a model you have not trained yet from the losses of smaller ones. Almost everything else in this series is contested craft. This is a law.

And yet the single most cited practical result built on that law, the Chinchilla compute optimal recipe, is in 2026 mostly a corpse that tutorials keep propping up in a chair and addressing as though it were alive. Understanding exactly how it died, and exactly what part of the theory is a measurement artifact, and exactly what real mystery is left standing after you clear away the dead and the fake, is the most clarifying thing you can do for your intuition about where models are going.

---

## The law, and the recipe built on it

The early scaling laws came from Kaplan and colleagues. The sharper version came from Hoffmann and colleagues at DeepMind, the Chinchilla paper, and it answered a specific question. Given a fixed compute budget, how should you split it between making the model bigger and training it on more data. Their answer, widely repeated as a rule of thumb, was to scale both together, roughly twenty tokens of training data per parameter.

The interactive figure below shows the frontier the parametric loss produces, the optimal model size climbing with the compute budget along a smooth curve. But look closely at the tokens per parameter column and you find the first crack. It does not sit at twenty. It drifts from about thirty up past a hundred as the budget grows. That is not a bug in the experiment. The famous twenty comes from one of the three estimation methods in the Chinchilla paper, and the parametric loss form, from a different method in the same paper, implies a ratio that moves with scale. The paper's own methods disagree with each other. That disagreement is not a footnote to skip. It is the first sign that the optimal ratio was never a constant of nature, which is precisely why it turned out to be so easy to abandon.

---

## How it actually died. The basin is flat

Here is the real cause of death, and it is beautiful because it is visible in the numbers.

Chinchilla optimizes the compute spent to reach a given loss during training. But a deployed model spends the overwhelming majority of its lifetime compute not on the one time training run but on inference, answering billions of requests. And the loss surface around the compute optimal point is remarkably flat. Fix the budget in that same figure and shrink the model below the optimum. Cutting the model to one eighth of the optimal size, and training it on eight times the tokens per parameter to spend the same compute, costs about three and a half percent of loss. Three and a half percent. In exchange you get a model one eighth the size, which is close to one eighth the cost on every single forward pass it will ever perform in production.


<iframe class="pf-frame" src="/pretraining/05-scaling-laws.html" title="Interactive figure. The death of Chinchilla" loading="lazy" style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/05-scaling-laws.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


Now do the amortization, which is the argument the fab post makes in its own terms. A tiny, permanent, per request saving multiplied across the entire deployed life of a model dwarfs a one time training penalty of a few percent of loss. So the rational move is to leave the compute optimal point on purpose, train a smaller model far past the point of training efficiency, and bank the serving savings forever. This is why the frontier trains small models on absurd token counts. It is not a machine learning result at all. It is an amortization decision made against an inference bill, which is to say it is the semiconductor economics of the fab post wearing a scaling laws costume. Chinchilla answered the training compute question correctly and then the world stopped asking that question.

There is also a new axis that did not exist when Chinchilla was written. Test time compute, the reasoning models that generate long chains of thought before answering, buys capability at inference time rather than baking all of it in during pretraining. It partially substitutes for pretraining scale, and it shifts the hardware demand toward the low latency, memory bound serving regime the roofline experiment showed running at a fraction of peak. The scaling picture is no longer a single knob. It is at least three, and the compute optimal recipe only ever described one of them.

---

## Emergence is mostly a mirage

The other romantic idea in scaling is emergence, the claim that qualitatively new abilities appear suddenly and unpredictably once a model crosses a size threshold. It is a thrilling story and it launched a thousand think pieces. It is also, in large part, a measurement artifact, and you can reproduce the illusion in a few lines.

The interactive figure below models a per token correctness probability that improves perfectly smoothly with scale, nothing sudden anywhere in the ground truth. Then it scores that smooth improvement two ways. Per token accuracy, which climbs smoothly and boringly from 0.1 to 0.96. And exact match accuracy over a twenty token answer, which requires every token to be right at once. The exact match number stays near zero while per token accuracy is merely good, then leaps from essentially zero toward one over a single scale step. That leap is the celebrated emergent ability, and it is nothing but a smooth number raised to a high power. Schaeffer and colleagues made this argument carefully in 2023, and the toy reproduces its spine. Change from an all or nothing metric to one that gives partial credit and the cliff dissolves back into the smooth slope it always was.


<iframe class="pf-frame" src="/pretraining/12-emergence-mirage.html" title="Interactive figure. Emergence as a mirage" loading="lazy" style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/12-emergence-mirage.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


The practical discipline that follows is severe. Distrust any emergence claim built on a discontinuous metric, which is most of them. A great deal of breathless capability reporting is a hard threshold applied to a smooth underlying trend.

---

## The mystery that survives

Now clear away the dead recipe and the fake cliff and look at what is still standing, because something is, and it is the most important unsolved problem in the science of pretraining.

The loss is smooth and predictable. The capabilities the loss is supposed to represent do not feel smooth. Grokking, the sudden late generalization after a long plateau of apparent memorization, is real and reproducible and not a metric artifact. Internal reorganizations, circuits forming, features separating, do seem to happen in something closer to phases than to a smooth glide. So we are left with a genuine and uncomfortable gap. We have a beautiful predictive theory for the loss, and almost no predictive theory for the abilities that matter, the ones the loss stands in for. We can tell you what the next model's loss will be. We cannot reliably tell you what it will be able to do.

That gap is where the real science is. Predicting downstream capability from upstream loss, understanding which abilities track loss smoothly and which reorganize in steps, and knowing in advance which is which, is unsolved and central. Emergence as usually reported is a mirage. But the thing the mirage was pointing at, the mismatch between our smooth theory and the jagged reality of capability, is real, and it is the frontier of understanding rather than a settled law.

---

## What to take away

Hold three things at once, because they are all true and they are usually confused for one another. The Chinchilla recipe is dead, killed not by a better law but by the flat basin and the arithmetic of inference. Emergence, as popularly reported, is mostly an artifact of cruel metrics. And underneath both, the gap between predictable loss and unpredictable capability is a live, deep, open problem that neither the dead recipe nor the fake cliff should distract you from.

The through line to the rest of the series is the same one that keeps appearing. Even scaling, the most scientific corner of pretraining, turns out on inspection to be governed by inference economics and by what we can and cannot measure, more than by any clean law about intelligence. The law is real. It just does not decide as much as its fame suggests.

*The figures above are interactive, so drag and toggle them. Sources and hedges for every claim are in [references.md](/pretraining/references.md).*

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
