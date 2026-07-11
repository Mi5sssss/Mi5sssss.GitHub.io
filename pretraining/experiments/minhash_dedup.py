"""
Experiment. Near duplicate detection with MinHash and LSH, the workhorse of data dedup.

Exact dedup is trivial, hash the document and drop collisions. The hard and important
case is near duplicates. The same news article reworded, a page with a different header,
boilerplate that appears ten thousand times with tiny edits. These inflate a corpus and
teach a model to memorize instead of generalize, and removing them measurably improves
models. MinHash estimates the Jaccard similarity of two documents from tiny signatures,
and locality sensitive hashing (LSH) finds the similar pairs without comparing all pairs.

This builds both from scratch on a toy corpus and shows the signatures recover the true
similarity and that LSH flags the near duplicates while leaving unrelated documents alone.
Stdlib only, deterministic via hashlib.
"""

import hashlib
from itertools import combinations

# ---- toy corpus. realistic length, with exact and near duplicates and unrelated docs ----
_base = ("the memory wall means that for decades peak compute has grown much faster "
         "than memory bandwidth. two exponentials with different bases pull apart without "
         "limit. so a modern accelerator spends most of its time starved, waiting on the "
         "wire to memory rather than on the arithmetic units themselves.")

docs = {
    "A original":   _base,
    "B exact dup":  _base,
    # C changes a few words but keeps the structure, a reworded copy
    "C reworded":   ("the memory wall means that for years peak compute has grown far faster "
                     "than memory bandwidth. two exponentials with different bases pull apart without "
                     "bound. so a modern accelerator spends most of its time starved, waiting on the "
                     "path to memory rather than on the arithmetic units themselves."),
    # D is the same article with a boilerplate header and footer glued on, the classic case
    "D boilerplate":("subscribe now for more. " + _base + " share this post with a friend today."),
    # unrelated
    "E unrelated":  ("grouped query attention shrinks the key value cache so that decoding a long "
                     "context does not have to stream hundreds of gigabytes out of memory per token."),
    "F unrelated2": ("the tokenizer fertility of source code is higher than that of ordinary english "
                     "prose, so a fixed context window holds fewer lines of code than words of text."),
}

K = 2          # word shingle size
NUM_HASHES = 128
BANDS = 32     # LSH bands, rows per band = NUM_HASHES / BANDS = 4
ROWS = NUM_HASHES // BANDS

def shingles(text, k=K):
    words = text.split()
    if len(words) < k:
        return {text}
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}

def h(salt, s):
    return int(hashlib.md5((str(salt) + "|" + s).encode()).hexdigest(), 16)

def signature(shs):
    """One min hash per salt. The classic MinHash signature."""
    sig = []
    for salt in range(NUM_HASHES):
        sig.append(min(h(salt, s) for s in shs))
    return sig

def true_jaccard(a, b):
    return len(a & b) / len(a | b)

def est_jaccard(sa, sb):
    return sum(1 for x, y in zip(sa, sb) if x == y) / len(sa)

sh = {name: shingles(t) for name, t in docs.items()}
sig = {name: signature(s) for name, s in sh.items()}

print("=" * 72)
print("True Jaccard versus MinHash estimate, all document pairs")
print("=" * 72)
header = f"{'pair':<28}{'true':>8}{'estimate':>10}{'error':>8}"
print(header)
print("-" * len(header))
for a, b in combinations(docs, 2):
    tj = true_jaccard(sh[a], sh[b])
    ej = est_jaccard(sig[a], sig[b])
    if tj > 0.05 or ej > 0.05:
        print(f"{a[:12]+' vs '+b[:10]:<28}{tj:>8.2f}{ej:>10.2f}{abs(tj-ej):>8.2f}")

# ---- LSH banding. candidate pair if any band matches ----
approx_threshold = (1.0 / BANDS) ** (1.0 / ROWS)
buckets = {}
for name, s in sig.items():
    for b_i in range(BANDS):
        band = tuple(s[b_i * ROWS:(b_i + 1) * ROWS])
        key = (b_i, hashlib.md5(str(band).encode()).hexdigest())
        buckets.setdefault(key, []).append(name)

candidates = set()
for names in buckets.values():
    for a, b in combinations(sorted(set(names)), 2):
        candidates.add((a, b))

print(f"""
LSH with {BANDS} bands of {ROWS} rows flags a pair if any band collides.
Its approximate similarity threshold is {approx_threshold:.2f}.
Flagged near duplicate pairs, these would be collapsed to one copy.
""")
for a, b in sorted(candidates):
    print(f"  {a}  ~  {b}   (true Jaccard {true_jaccard(sh[a], sh[b]):.2f})")

print(f"""
Reading the result.
The estimate column tracks the true similarity using signatures a fraction of the size
of the documents, which is the point, it scales to trillions of tokens. LSH then finds
the near duplicates in near linear time and leaves the unrelated sentences E and F alone.
Real pipelines run exactly this at web scale, and removing what it finds is one of the
highest leverage things you can do to a pretraining corpus. Dedup is not housekeeping,
it is capability.
""")
