"""
Experiment. Emergence as a mirage, reproduced on toy numbers.

The romantic claim is that new abilities appear suddenly at a scale threshold. Schaeffer
and colleagues argued in 2023 that much of this is a measurement artifact. If the metric
is all or nothing, like requiring every token of an answer to be exactly right, then a
smooth underlying improvement gets crushed into a sharp jump. Change to a metric that
gives partial credit and the jump dissolves back into the smooth curve it always was.

We model a per token correctness probability that rises smoothly with scale, then score it
two ways. Exact match over a multi token answer, which looks emergent, and per token
accuracy, which does not. Same model, same smooth improvement, two different stories.

Stdlib only.
"""

import math

ANSWER_LEN = 20   # tokens that must all be correct for an exact match

def per_token_prob(scale_exp):
    """A perfectly smooth improvement in per token correctness as scale grows.
    Nothing discontinuous is happening here. This is the ground truth."""
    x = scale_exp - 9.0                      # center the curve
    return 1.0 / (1.0 + math.exp(-1.1 * x))  # smooth logistic, no threshold

print("=" * 74)
print("One smooth improvement, two metrics. Watch exact match invent a cliff.")
print(f"answer length {ANSWER_LEN} tokens, exact match needs every token right")
print("=" * 74)
header = f"{'scale (log10 params)':>22}{'per token acc':>16}{'exact match acc':>18}"
print(header)
print("-" * len(header))
prev_em = 0.0
big_jump_at = None
for e10 in [7, 8, 9, 10, 11, 12]:
    p = per_token_prob(e10)
    em = p ** ANSWER_LEN
    if big_jump_at is None and em - prev_em > 0.25:
        big_jump_at = e10
    print(f"{e10:>22}{p:>16.3f}{em:>18.3f}")
    prev_em = em

print(f"""
Reading the result.
The per token accuracy column climbs smoothly and boringly. Nothing sudden. But the exact
match column, which demands all {ANSWER_LEN} tokens be correct at once, stays near zero while
per token accuracy is merely good, then leaps toward one over a single scale step around
10 to the {big_jump_at}. That leap is the celebrated emergent ability, and it is an artifact of
raising a smooth number to a high power, not a phase change in the model. The lesson is not
that emergence is fake. Grokking and real reorganizations exist. The lesson is that you must
distrust any emergence claim built on an all or nothing metric, and that our beautiful theory
predicts the smooth loss, not the jagged capability the loss is supposed to stand for.
""")
