"""
Experiment. Mixture of experts is a memory versus compute trade, in one table.

The pitch for MoE is that you grow total parameters without growing the compute each
token costs, because a router sends every token to only a few of the many experts. The
catch is that all those parameters still have to live in memory somewhere, sharded across
chips, and moved over the interconnect. This experiment computes total versus active
parameters for a dense model and for MoE variants, so the trade is impossible to miss.

Stdlib only. Illustrative shapes for a mid size model.
"""

# ---- shared shape ----
d_model = 4096
d_ff    = 4 * d_model         # dense feedforward hidden size
n_layers = 32
vocab = 128_000

def attn_params_per_layer():
    return 4 * d_model * d_model          # q k v o projections

def ffn_params_per_layer():
    return 2 * d_model * d_ff             # up and down projection

def model_params(n_experts=1, top_k=1):
    """Total and active parameters. n_experts of 1 is the dense baseline."""
    attn = attn_params_per_layer() * n_layers
    embed = vocab * d_model               # tied embeddings counted once
    ffn_total  = ffn_params_per_layer() * n_experts * n_layers
    ffn_active = ffn_params_per_layer() * top_k     * n_layers
    total  = attn + embed + ffn_total
    active = attn + embed + ffn_active
    return total, active

def B(x):
    return x / 1e9

configs = [
    ("dense",              1,   1),
    ("MoE 8 experts, k=2", 8,   2),
    ("MoE 64 experts, k=2",64,  2),
    ("MoE 256 experts, k=8",256, 8),
]

print("=" * 78)
print("Total versus active parameters. Active is what each token actually computes.")
print("=" * 78)
header = f"{'configuration':<24}{'total (B)':>12}{'active (B)':>12}{'total/active':>14}"
print(header)
print("-" * len(header))
for name, e, k in configs:
    total, active = model_params(e, k)
    print(f"{name:<24}{B(total):>12.1f}{B(active):>12.1f}{total / active:>13.1f}x")

print(f"""
Reading the result.
The dense row is the baseline. Every MoE row keeps the active parameters, and therefore
the compute per token, in the same neighborhood as a much smaller dense model, while the
total parameter count balloons. The last column is the whole story. A large MoE can carry
tens of times more parameters than it activates. That is the gift, more knowledge capacity
at fixed compute per token. It is also the bill. Every one of those total parameters must
be held in HBM and reached over the fabric, which is why MoE only pays off with fast
interconnect and expert parallelism, and why the trade is memory and networking, not math.
The FLOPs got cheaper. The bytes got much more expensive.
""")
