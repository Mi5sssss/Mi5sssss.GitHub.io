// Lightweight runtime loader for Google Scholar publications
// Fetches via Jina AI Reader (r.jina.ai) to bypass CORS and parses titles heuristically.
// Renders into a container by id. Gracefully degrades with a fallback link.

(function () {
  function uniq(arr) {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const k = v.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(v);
      }
    }
    return out;
  }

  function isLikelyTitle(line) {
    if (!line) return false;
    const l = line.trim();
    if (l.length < 8 || l.length > 200) return false;
    // Exclude common boilerplate words from Scholar pages
    const bad = [
      'cited by', 'citations', 'h-index', 'i10-index', 'co-authors', 'profile',
      'public access', 'settings', 'sign in', 'following', 'related articles',
      'sorted by', 'title', 'year', 'all', 'include', 'about', 'help', 'privacy', 'terms',
    ];
    const lower = l.toLowerCase();
    if (bad.some((b) => lower.includes(b))) return false;
    // Heuristic: titles usually contain spaces and letters, not ending with ':' frequently
    if (!/[a-zA-Z]/.test(l)) return false;
    // Avoid lone author lists (commas + initials heavy) by requiring at least one long word
    const words = l.split(/\s+/);
    if (words.filter((w) => w.length >= 5).length < 1) return false;
    return true;
  }

  function renderList(target, titles, userId) {
    if (!titles || !titles.length) {
      target.innerHTML = '<p>No recent publications found. <a href="https://scholar.google.com/citations?user=' + encodeURIComponent(userId) + '&hl=en&sortby=pubdate" target="_blank" rel="noopener">View on Google Scholar</a>.</p>';
      return;
    }
    const ul = document.createElement('ul');
    ul.style.marginLeft = '1rem';
    ul.style.listStyle = 'disc';
    titles.forEach((t) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = t;
      a.href = 'https://scholar.google.com/scholar?q=' + encodeURIComponent(t);
      a.target = '_blank';
      a.rel = 'noopener';
      li.appendChild(a);
      ul.appendChild(li);
    });
    const more = document.createElement('p');
    more.innerHTML = '<a href="https://scholar.google.com/citations?user=' + encodeURIComponent(userId) + '&hl=en&sortby=pubdate" target="_blank" rel="noopener">View more on Google Scholar</a>';
    target.innerHTML = '';
    target.appendChild(ul);
    target.appendChild(more);
  }

  async function fetchScholarText(userId) {
    const scholarUrl = 'https://scholar.google.com/citations?hl=en&user=' + encodeURIComponent(userId) + '&view_op=list_works&sortby=pubdate';
    // Use Jina AI Reader to bypass CORS and get plaintext
    const relay = 'https://r.jina.ai/https://scholar.google.com/citations?hl=en&user=' + encodeURIComponent(userId) + '&view_op=list_works&sortby=pubdate';
    const resp = await fetch(relay, { mode: 'cors' });
    if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
    return resp.text();
  }

  function extractTitlesFromText(txt, maxItems) {
    const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Find a window likely containing the works list by detecting repetitions of "Cited by"
    let start = 0;
    let citedIdxs = [];
    lines.forEach((l, i) => { if (/^cited by\b/i.test(l)) citedIdxs.push(i); });
    if (citedIdxs.length >= 3) {
      start = Math.max(0, Math.min.apply(null, citedIdxs) - 60);
    }
    const windowed = lines.slice(start);
    // Collect candidate titles while skipping known non-title lines
    let candidates = windowed.filter(isLikelyTitle);
    // Titles are often followed by authors/venue lines. Reduce noise by preferring lines
    // that are followed by something that looks like authors or venue (comma heavy or year)
    const refined = [];
    for (let i = 0; i < candidates.length; i++) {
      const t = candidates[i];
      const idx = windowed.indexOf(t);
      const next = idx >= 0 && idx + 1 < windowed.length ? windowed[idx + 1] : '';
      const looksLikeMeta = /\b\d{4}\b/.test(next) || /,/.test(next) || /Proceedings|International|Conference|Symposium|Journal|arXiv/i.test(next);
      if (looksLikeMeta) refined.push(t);
    }
    let titles = refined.length ? refined : candidates;
    titles = uniq(titles).slice(0, maxItems);
    return titles;
  }

  async function loadScholarPublications(opts) {
    const userId = (opts && opts.userId) || '';
    const targetId = (opts && opts.targetId) || 'publications-list';
    const maxItems = (opts && opts.maxItems) || 10;
    const target = document.getElementById(targetId);
    if (!target) return;

    try {
      target.innerHTML = '<p>Loading publications...</p>';
      const text = await fetchScholarText(userId);
      const titles = extractTitlesFromText(text, maxItems);
      renderList(target, titles, userId);
    } catch (err) {
      console.warn('Scholar load failed:', err);
      target.innerHTML = '<p>Unable to auto-load publications. <a href="https://scholar.google.com/citations?user=' + encodeURIComponent(userId) + '&hl=en&sortby=pubdate" target="_blank" rel="noopener">View on Google Scholar</a>.</p>';
    }
  }

  // Expose globally
  window.loadScholarPublications = loadScholarPublications;
})();
