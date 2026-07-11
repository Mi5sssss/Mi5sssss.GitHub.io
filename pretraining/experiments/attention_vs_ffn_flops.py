"""
Experiment. Where does the compute actually go, attention or the feedforward network?

Everyone talks about attention as the heart of the Transformer, and the quadratic cost of
attention is the reason long context is hard. But at ordinary context lengths most of the
arithmetic is not in attention at all. It is in the feedforward network. This experiment
computes the per token FLOP breakdown across context lengths and finds the crossover where
the quadratic attention term finally overtakes the feedforward term. That crossover is why
long context is a distinct and expensive regime rather than a free parameter.

Stdlib only. Per token, per layer, forward pass. A multiply add is counted as 2 FLOPs.
"""

d_model = 8192
d_ff    = 4 * d_model

def flops_per_token_per_layer(seq):
    # linear projections cost 2 times their parameter count per token
    attn_proj = 2 * (4 * d_model * d_model)          # q k v o
    # the sequence dependent part. one token attends to seq keys, then weights seq values
    attn_seq  = 2 * (seq * d_model) + 2 * (seq * d_model)   # scores plus weighted sum
    ffn       = 2 * (2 * d_model * d_ff)             # up and down
    return attn_proj, attn_seq, ffn

print("=" * 80)
print("Per token FLOP breakdown by context length. Where the arithmetic actually lives.")
print("=" * 80)
print(f"d_model {d_model}, d_ff {d_ff}\n")
header = f"{'context':>10}{'attn proj':>13}{'attn seq':>13}{'ffn':>13}{'attn share':>13}"
print(header)
print("-" * len(header))

crossover = None
for seq in [512, 2048, 8192, 32768, 131072, 524288]:
    ap, as_, ffn = flops_per_token_per_layer(seq)
    attn_total = ap + as_
    total = attn_total + ffn
    share = 100.0 * attn_total / total
    if crossover is None and attn_total > ffn:
        crossover = seq
    def g(x):
        return f"{x/1e9:.2f}G"
    print(f"{seq:>10}{g(ap):>13}{g(as_):>13}{g(ffn):>13}{share:>12.0f}%")

# analytic crossover of the sequence term alone versus ffn
# attn_seq (4 seq d) overtakes ffn (4 d d_ff) when seq > d_ff
print(f"""
Reading the result.
At a 512 or 2048 token context, most of the compute (about two thirds) is in the feedforward
network, and the quadratic sequence term is a rounding error. It only takes over once the
context passes roughly the feedforward hidden size, near {d_ff} tokens here, after which the
sequence dependent attention term dominates and keeps growing with length. This is the real
shape of the cost. Ordinary use is feedforward bound, which is why MoE, which enlarges the
feedforward part, is where the parameter action is. Long context is a different regime with
different economics, which is why context length is sold as a premium feature and why so much
architecture work (sliding windows, latent attention) targets exactly this quadratic tail.
""")
