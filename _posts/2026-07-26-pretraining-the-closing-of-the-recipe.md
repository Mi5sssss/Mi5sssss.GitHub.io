---
layout: post
title: "The Closing of the Recipe"
excerpt: "Part 5. When every model shares one skeleton, the moat becomes the thing nobody publishes."
modified: 7/26/2026, 00:00:00
tags: [AI infrastructure, pretraining, large language models, scaling laws, semiconductors]
comments: true
category: blog
---

*Part 5 of the series, and the closer. The hub is [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). This post is about industry structure and academic counterweight, the strategic shape of a field where the science is converging and the secrets are moving. Its one figure compares model families, because its subject, the hidden recipe, is exactly the thing nobody puts in public.*

---

The hardware lottery post established a fact that this one takes as its starting point. Every frontier model has converged on the same architecture. Decoder only, rotary embeddings, the same normalization and activation, grouped or latent attention, mixture of experts. If that is true, and it is, then a strange question follows immediately. When the skeletons are identical, where does the competition live. It cannot live in the architecture, because there is nothing left to differentiate there. It has to have moved somewhere. Finding out where it moved tells you almost everything about the current structure of the industry, and about a slow conflict that will shape the next twenty years more than any model release.


<iframe class="pf-frame" src="/pretraining/06-industry-convergence.html" title="Interactive figure. The converging frontier" loading="lazy" style="width:100%; height:900px; border:1px solid #ddd; border-radius:8px;"></iframe>

<p style="margin-top:-4px; font-size:14px;"><a href="/pretraining/06-industry-convergence.html" target="_blank" rel="noopener">Open this figure in a new tab</a></p>


---

## The competition moved, and it moved somewhere you cannot see

The competition moved to the two things this series has been circling from the start. Data, which the first post argued is the real moat. And post training, the reinforcement learning and reasoning layers stacked on top of the base model. Both of these share a property that architecture does not. They are craft, accumulated over years, and they do not leak when you ship the product.

This is the key to the whole strange situation, and it is why the phrase open source means something very particular and very limited in this field. A lab can release the weights of a model, hundreds of billions of numbers, and reveal almost nothing about how it was actually made. The mixture of data, the filtering thresholds, the synthetic data pipeline, the exact post training procedure, the thousand small decisions that separate a good model from a frontier one, none of that is in the weights in any legible form. Open weights give you the destination. They withhold the map. And the map is the entire moat.

---

## Open weights are a strategy, not a gift

It is worth being blunt about this, because the public conversation is sentimental about it. When a large company releases open weight models, it is not primarily an act of generosity. It is a strategy. Releasing capable weights commoditizes the layer your competitors are trying to sell, builds an ecosystem and a hiring funnel around your stack, and costs you little of your actual advantage, because your actual advantage was never the weights. It was the recipe and the pipeline and the post training, all of which you kept. You can give away the destination precisely because you are confident nobody can reconstruct the map from it. Open weights are the most defensible kind of generosity, the kind that gives away the thing that is no longer the source of your lead.

This reframes the open versus closed debate that dominates so much commentary. The meaningful axis is not open weights versus closed weights. It is open recipe versus closed recipe, and on that axis almost everyone is closed, including most of the labs celebrated as open. The thing being hoarded shifted from the artifact to the process, and a great deal of writing has not noticed the shift and is still arguing about the artifact.

---

## The line between pretraining and everything after is dissolving

There is a second structural change that makes the recipe even harder to see from outside, and it is the dissolution the hub named as its spine. There used to be a clean story. Pretraining built the base model, then a separate post training phase aligned it. That clean line is gone. In its place is a continuum, and the middle of it has acquired a name, mid training, the long context extension and high quality data annealing and capability shaping that happens between the two classical phases.

This blurring is not just terminology. It means the recipe is now distributed across a pipeline with no clean seams, which makes it both more powerful and more opaque. You cannot point to the one phase where the magic happened, because the magic is smeared across a continuous process that each lab tunes in its own private way. The capability timeline in the hub sketches that continuum, capability accumulating across phases with soft rather than sharp boundaries. An outside observer holding only the final weights is looking at the output of a long, secret, seamless process and trying to infer the process. It is very hard, on purpose.

---

## The asymmetry that decides who can catch up

Put the pieces together and you get the asymmetry that governs competition in this field. Catching up to a frontier model on architecture is a weekend, because the architecture is public and converged and simple to copy. Catching up on data pipeline and post training is the entire war, because those are years of accumulated, hidden, non transferable craft. The DeepSeek moment from the fab post fits exactly here. Its significance was not only the low reported cost. It was the demonstration that a team could assemble the hidden craft well enough to reach the frontier, and then say a great deal about how, which is the rarer and more subversive act. Efficiency plus openness about method is the one combination that actually threatens the incumbents, because it attacks the moat itself rather than the artifact the moat protects.

---

## The academy is the counterweight, and the stakes are not academic

Now the other side of the structure, because a field where the industry is closing needs a counterweight, and it has one. The academy runs in the opposite direction. Its whole reason for being is to make knowledge public and reproducible, and it has concentrated, sensibly, in exactly the places where industry has the least incentive to publish.

Open models and open datasets matter far beyond their raw capability, because they are the reproducible baselines without which there is no science at all. You cannot study what you cannot run. Mechanistic interpretability, the actual investigation of what these models compute internally, is largely an open enterprise. So is much of the data science of curation, the theory of scaling, and the work on efficient training that lets a lab with a hundred chips contribute to a field increasingly built for people with a hundred thousand. Every rigorous open replication of a closed result is a small act of resistance against the enclosure of a commons.

And that word, enclosure, is the right one, because the stakes are not academic in the dismissive sense. This is a fight over whether the knowledge of how to build machine intelligence becomes public infrastructure, like the knowledge of how to build a compiler or a database, or private property held by a handful of firms. Every closed recipe fences off a piece of what could have been common knowledge. Every open dataset and honest technical report pushes the fence back. Which side wins is not a technical question, and it will shape the distribution of power around this technology more than any single capability milestone.

---

## The through line

This is where the series ends, so let the whole argument stand up at once. Pretraining is gated by the fab, by memory bandwidth and packaging and depreciation, that was the hardware post. Its architecture has converged because the silicon chose it, that was the hardware lottery. Its real moat is the data, that was the first post. Its most scientific corner, scaling, turns out to be governed by inference economics and by what we can measure, that was the death of Chinchilla. And now, finally, its competitive structure has become a contest not over models but over the hidden recipe, fought between an industry that is closing and an academy trying to keep the door open.

The unifying non consensus claim under all five posts is a single reframe. Almost everything people attribute to ideas about intelligence, the architecture, the scaling recipe, the capabilities, is actually downstream of something less romantic and more predictable. The physics of moving bytes. The economics of owning melting machines. The craft of curating data. And the politics of who is allowed to know how it was done. That is what pretraining actually is, once it grew up and left the research lab. The intelligence is real. But the forces shaping it are the forces that shape any mature industrial technology, and you will understand it far better if you read it as one.

*This is the final post. The series began at the hub, [The Fossil Fuel of Intelligence](/blog/pretraining-the-fossil-fuel-of-intelligence/). Sources and hedges for every claim across all five posts are in [references.md](/pretraining/references.md).*

<script>
(function(){
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe.pf-frame'));
  function resize(f){ try{ var d=f.contentWindow.document.documentElement; f.style.height=(d.scrollHeight+24)+'px'; }catch(e){} }
  frames.forEach(function(f){
    f.addEventListener('load', function(){
      resize(f); setTimeout(function(){resize(f);}, 300);
      ['click','change','input'].forEach(function(ev){
        try{ f.contentWindow.document.addEventListener(ev, function(){ setTimeout(function(){resize(f);}, 90); }); }catch(e){}
      });
    });
  });
  window.addEventListener('resize', function(){ frames.forEach(function(f){ setTimeout(function(){resize(f);}, 120); }); });
})();
</script>
