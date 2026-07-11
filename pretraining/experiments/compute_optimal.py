"""
Experiment. Compute optimal is a flat basin, which is why overtraining is nearly free.

Chinchilla says that for a fixed compute budget there is an optimal split between model
size and training tokens, near twenty tokens per parameter. True. But the loss surface
around that optimum is remarkably flat, and that flatness is the loophole that killed
Chinchilla in practice. You can pick a much smaller model, train it on far more tokens,
pay a tiny loss penalty, and be rewarded with a model that is cheaper to serve on every
one of the billions of requests it will ever answer. This experiment shows both facts.
The optimum, and the flat basin that makes leaving it worthwhile.

Uses the Chinchilla parametric loss. Constants from Hoffmann et al. 2022. Illustrative.
"""

E, A, al, B, be = 1.69, 406.4, 0.34, 410.7, 0.28

def loss(N, D):
    return E + A / N ** al + B / D ** be

def optimal_N(C):
    best_l, best_N = 1e9, None
    N = 1e6
    while N <= 1e13:
        D = C / (6 * N)
        if D >= 1e6:
            l = loss(N, D)
            if l < best_l:
                best_l, best_N = l, N
        N *= 1.02
    return best_N

def hb(x):
    for u in ["", "K", "M", "B", "T"]:
        if abs(x) < 1000:
            return f"{x:.1f}{u}"
        x /= 1000
    return f"{x:.1f}P"

print("=" * 78)
print("Compute optimal frontier. The Chinchilla split, per budget.")
print("=" * 78)
header = f"{'compute C':>12}{'optimal N':>12}{'tokens D':>12}{'tokens/param':>15}{'loss':>8}"
print(header)
print("-" * len(header))
for exp in [19, 21, 23, 25]:
    C = 10 ** exp
    N = optimal_N(C)
    D = C / (6 * N)
    print(f"{'1e'+str(exp):>12}{hb(N):>12}{hb(D):>12}{D / N:>14.0f}{loss(N, D):>8.3f}")

print("""
Note. The famous twenty tokens per parameter is from one of the three estimation methods in
the Chinchilla paper. The parametric loss form used here, from a different method in the same
paper, gives a ratio that drifts upward with budget rather than staying fixed. That the paper's
own methods disagree is not a footnote, it is a hint that the optimal ratio was never a law of
nature, which is part of why the recipe has been so easy to revise in practice.""")

# ---- the flat basin. fix a budget, shrink the model, pay the penalty ----
C = 1e23
Nopt = optimal_N(C)
Lopt = loss(Nopt, C / (6 * Nopt))

print(f"""
The flat basin at fixed compute C of 1e23. Shrink the model below the optimum and watch
the loss penalty stay tiny while the serving cost (proportional to active parameters) falls.
""")
header2 = f"{'size vs opt':>13}{'N':>10}{'tokens/param':>15}{'loss':>9}{'loss penalty':>15}{'serve cost':>12}"
print(header2)
print("-" * len(header2))
for frac in [1.0, 0.5, 0.25, 0.125]:
    N = Nopt * frac
    D = C / (6 * N)
    l = loss(N, D)
    pen = 100.0 * (l - Lopt) / Lopt
    print(f"{frac:>12.3f}x{hb(N):>10}{D / N:>14.0f}{l:>9.3f}{pen:>14.2f}%{frac:>11.3f}x")

print(f"""
Reading the result.
Every doubling down in tokens per parameter costs a fraction of a percent of loss, but
cuts the model in half, and a model half the size is close to half the cost on every
forward pass it will ever do in production. Multiply that saving across the entire life of
a deployed model and the arithmetic is overwhelming. This is why the frontier trains small
models on absurd token counts, far past the Chinchilla point. The compute optimal recipe
optimizes the one time training bill. The real objective is the whole lifetime bill, and
against that objective the flat basin makes overtraining the obvious move.
""")
