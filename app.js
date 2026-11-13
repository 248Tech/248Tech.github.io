(async () => {
  const grid = document.getElementById('grid');
  const q = document.getElementById('q');
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  let data;
  try { data = await (await fetch('projects.json', { cache: 'no-cache' })).json(); }
  catch { grid.textContent = 'Could not load projects.'; return; }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const pretty = n => n.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

  const cards = data.projects.map(p => {
    const card = el('article', 'card');
    card.style.setProperty('--h', hue(p.name));
    const art = el('div', 'art', p.name.slice(0, 2).toUpperCase());
    art.setAttribute('aria-hidden', 'true');
    const body = el('div', 'body');
    body.append(el('h2', null, pretty(p.name)), el('p', 'desc', p.description || 'No description yet.'));
    const meta = el('div', 'meta');
    if (p.language) meta.append(el('span', 'chip', p.language));
    for (const t of p.topics.slice(0, 3)) meta.append(el('span', 'chip dim', t));
    if (p.stars) meta.append(el('span', 'chip dim', '★ ' + p.stars));
    const actions = el('div', 'actions');
    const live = el('a', 'btn primary', 'Open live site'); live.href = p.site; live.rel = 'noopener';
    const src = el('a', 'btn', 'Source'); src.href = p.repo; src.rel = 'noopener';
    actions.append(live, src);
    body.append(meta, actions);
    card.append(art, body);
    card.dataset.text = (p.name + ' ' + p.description + ' ' + p.language + ' ' + p.topics.join(' ')).toLowerCase();
    grid.append(card);
    return card;
  });

  const filter = () => {
    const s = q.value.trim().toLowerCase();
    let n = 0;
    for (const c of cards) { const show = !s || c.dataset.text.includes(s); c.hidden = !show; if (show) n++; }
    count.textContent = n + (n === 1 ? ' project' : ' projects');
    empty.hidden = n > 0;
  };
  q.addEventListener('input', filter);
  filter();
  const t = document.getElementById('gen');
  t.textContent = new Date(data.generated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  t.dateTime = data.generated;

  // ---- lines of code widget ----
  const loc = data.loc;
  if (loc && loc.total) {
    const sec = document.getElementById('loc'); sec.hidden = false;
    const fmt = n => n.toLocaleString('en-US');
    const repos = Object.entries(loc.repos).sort((a, b) => b[1].total - a[1].total);
    document.getElementById('loc-repos').textContent = repos.length;
    const langs = Object.entries(loc.languages).sort((a, b) => b[1] - a[1]);
    const top = langs.slice(0, 7), rest = langs.slice(7).reduce((s, [, n]) => s + n, 0);
    if (rest) top.push(['Other', rest]);
    const bar = document.getElementById('loc-bar'), legend = document.getElementById('loc-legend'), segs = [];
    top.forEach(([name, n], i) => {
      const color = name === 'Other' ? '#64748b' : 'hsl(' + ((i * 47 + 20) % 360) + ' 70% 55%)';
      const seg = el('i'); seg.style.background = color; seg.style.flexBasis = '0%'; seg.title = name + ': ' + fmt(n); bar.append(seg); segs.push([seg, n]);
      const li = el('li'); const sw = el('i'); sw.style.background = color;
      li.append(sw, document.createTextNode(name + ' '), el('b', null, (n / loc.total * 100).toFixed(1) + '%')); legend.append(li);
    });
    const list = document.getElementById('loc-list'), max = repos[0][1].total;
    for (const [name, r] of repos) {
      const li = el('li'), tr = el('div', 'tr'), fill = el('i'); fill.style.width = (r.total / max * 100) + '%'; tr.append(fill);
      li.append(el('span', 'nm', name), tr, el('span', 'ct', fmt(r.total))); list.append(li);
    }
    const numEl = document.getElementById('loc-total');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const play = () => {
      segs.forEach(([s, n]) => { s.style.flexBasis = (n / loc.total * 100) + '%'; });
      if (reduce) { numEl.textContent = fmt(loc.total); return; }
      const t0 = performance.now(), dur = 1600;
      const tick = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); numEl.textContent = fmt(Math.round(loc.total * e)); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    numEl.textContent = fmt(loc.total);
    if ('IntersectionObserver' in window && !reduce) {
      numEl.textContent = '0';
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { play(); o.disconnect(); } }, { threshold: .3 }).observe(sec);
    } else play();
  }
})();
