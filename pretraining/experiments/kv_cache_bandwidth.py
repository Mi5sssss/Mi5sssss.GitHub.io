"""
Experiment. The KV cache is a memory bandwidth wall, and GQA and MLA are the walls being torn down.

Idea. During autoregressive decoding a model must read the entire key value cache
from memory for every single token it generates. Not compute on it heavily. Read it.
So decode speed is capped by how fast you can stream the KV cache out of HBM, long
before you run out of arithmetic. This experiment computes the cache size and the
resulting bandwidth ceiling for three attention schemes, and shows why the industry
moved from multi head attention to grouped query and then to latent attention.

Everything here is arithmetic on published shapes. No training, no framework. Stdlib only.
Numbers are illustrative of a 70B class model, not any specific product.
"""

# ---- a 70B class configuration (illustrative) ----
n_layers   = 80
d_model    = 8192
n_heads    = 64
head_dim   = d_model // n_heads      # 128
dtype_bytes = 2                      # bf16 or fp16 KV cache

# attention schemes differ only in how many key value heads they keep
schemes = {
    "MHA  (multi head, 64 kv heads)":      n_heads,        # one kv head per query head
    "GQA  (grouped, 8 kv heads)":          8,              # 8 to 1 sharing
    "MLA  (latent, compressed to ~512 d)": None,           # handled specially below
}
mla_latent_dim = 512   # DeepSeek style compressed latent, illustrative

# ---- HBM bandwidth of one accelerator (illustrative, H100 class) ----
hbm_bw_bytes_per_s = 3.35e12     # 3.35 TB/s

def kv_bytes_per_token(n_kv_heads=None, latent_dim=None):
    """Bytes of KV cache added per token, summed over all layers, batch 1."""
    if latent_dim is not None:
        # MLA stores one compressed latent per layer instead of full K and V heads
        return n_layers * latent_dim * dtype_bytes
    # store K and V, each n_kv_heads * head_dim, per layer
    return 2 * n_layers * n_kv_heads * head_dim * dtype_bytes

def human(n):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(n) < 1024:
            return f"{n:6.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"

print("=" * 78)
print("KV cache per token, cache size at context length, and decode ceiling")
print("=" * 78)

for ctx in [8_192, 128_000]:
    print(f"\ncontext length {ctx:,} tokens, batch 1, {dtype_bytes} byte KV\n")
    header = f"{'scheme':<38}{'per token':>12}{'full cache':>13}{'tok/s cap':>11}"
    print(header)
    print("-" * len(header))
    for name, n_kv in schemes.items():
        if n_kv is None:
            per_tok = kv_bytes_per_token(latent_dim=mla_latent_dim)
        else:
            per_tok = kv_bytes_per_token(n_kv_heads=n_kv)
        full = per_tok * ctx
        # to emit one new token you must read the whole cache once from HBM
        seconds_per_token = full / hbm_bw_bytes_per_s
        tok_per_s = 1.0 / seconds_per_token if seconds_per_token > 0 else float("inf")
        print(f"{name:<38}{human(per_tok):>12}{human(full):>13}{tok_per_s:>11.0f}")

print("""
Reading the result.
The full cache column is the memory that must be streamed out of HBM to produce
every token. At long context the MHA cache alone is larger than a single GPU can
hold and its bandwidth ceiling collapses. GQA cuts the cache by the sharing ratio.
MLA cuts it further by storing one small latent per layer. The tok/s cap counts
only the KV read, so real decode is slower, but the ordering and the wall are real.
This is why grouped query and latent attention exist. They are not accuracy tricks.
They are bandwidth tricks.
""")
