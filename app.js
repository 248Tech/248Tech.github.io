(async () => {
  const $ = id => document.getElementById(id);
  const grid = $('grid'), q = $('q'), count = $('count'), empty = $('empty'), filters = $('filters');
  $('yr').textContent = new Date().getFullYear();

  let data;
  try { data = await (await fetch('projects.json', { cache: 'no-cache' })).json(); }
  catch { grid.textContent = 'Could not load projects.'; return; }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  // Brand-correct names (the generic splitter would turn LyricVision into "Lyric Vision").
  const BRAND = { DarkNotepad: 'Dark Notepad', LyricVision: 'LyricVision', litemap: 'LiteMap', GarageIQ: 'GarageIQ',
    ShowTime: 'ShowTime', RTSPanda: 'RTSPanda', rentalos: 'RentalOS', ImgConvert: 'ImgConvert', QwenPad: 'QwenPad' };
  const prettyName = n => BRAND[n] || n.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const pretty = p => p.title || prettyName(p.name);
  const projects = data.projects;

  // stats, derived from real data
  const langs = [...new Set(projects.map(p => p.language).filter(Boolean))];
  const stars = projects.reduce((a, p) => a + (p.stars || 0), 0);
  const open = projects.filter(p => p.open).length;
  const stats = [[projects.length, 'Live projects'], [langs.length, 'Languages'],
    [open === projects.length ? '100%' : open + '/' + projects.length, 'Open source']];
  if (stars > 0) stats.push([stars, 'GitHub stars']);
  for (const [v, l] of stats) { const d = el('div'); d.append(el('dt', null, l), el('dd', null, String(v))); $('stats').append(d); }

  const build = (p, tag) => {
    const card = el('article', tag === 'feature' ? 'feature' : 'card');
    card.style.setProperty('--h', hue(p.name));
    const art = el('div', 'art'); art.append(el('span', null, pretty(p).slice(0, 2).toUpperCase()));
    const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 1216; img.height = 512;
    img.src = 'assets/banners/' + (p.banner || p.name) + '.webp';
    img.addEventListener('load', () => art.classList.add('has-img'));
    img.addEventListener('error', () => img.remove());
    art.prepend(img);
    art.setAttribute('aria-hidden', 'true');
    const body = el('div', 'body');
    if (tag === 'feature') body.append(el('span', 'tag', 'Featured project'));
    body.append(el(tag === 'feature' ? 'h3' : 'h3', null, pretty(p)), el('p', 'desc', p.description || 'No description yet.'));
    const meta = el('div', 'meta');
    if (p.commercial) meta.append(el('span', 'chip', 'Commercial'));
    if (p.language) meta.append(el('span', 'chip', p.language));
    for (const t of (p.topics || []).slice(0, 3)) meta.append(el('span', 'chip dim', t));
    if (p.stars) meta.append(el('span', 'chip dim', '★ ' + p.stars));
    const actions = el('div', 'actions');
    const live = el('a', 'btn primary', 'Open live demo'); live.href = p.demo || p.site; live.rel = 'noopener';
    // Open-source projects link their repo; commercial products (private source) link their product site.
    const second = el('a', 'btn', p.repo ? 'Source' : 'Product site');
    second.href = p.repo || p.site; second.rel = 'noopener';
    actions.append(live, second);
    body.append(meta, actions);
    card.append(art, body);
    return card;
  };

  // featured: pinned by name (falls back to the first project)
  const FEATURED = 'Mastermind-7DTD-AI-Server-Manager';
  const feat = projects.find(p => p.name === FEATURED) || projects[0];
  if (projects.length) {
    $('feature').append(build(feat, 'feature'));
    $('featured').hidden = false;
  }

  const rest = projects.length > 1 ? projects.filter(p => p !== feat) : projects;
  const cards = rest.map(p => {
    const c = build(p);
    c.dataset.lang = p.language || '';
    c.dataset.text = [p.name, p.title || '', p.description, p.language, ...(p.topics || [])].join(' ').toLowerCase();
    grid.append(c);
    return c;
  });

  // language filters
  let lang = '';
  const restLangs = [...new Set(rest.map(p => p.language).filter(Boolean))];
  if (restLangs.length > 1) {
    for (const l of ['', ...restLangs]) {
      const b = el('button', 'fchip', l || 'All'); b.type = 'button';
      b.setAttribute('aria-pressed', String(l === lang));
      b.addEventListener('click', () => {
        lang = l;
        for (const x of filters.children) x.setAttribute('aria-pressed', String(x === b));
        filter();
      });
      filters.append(b);
    }
  } else filters.hidden = true;

  function filter() {
    const s = q.value.trim().toLowerCase();
    let n = 0;
    for (const c of cards) {
      const show = (!s || c.dataset.text.includes(s)) && (!lang || c.dataset.lang === lang);
      c.hidden = !show; if (show) n++;
    }
    count.textContent = n + (n === 1 ? ' project' : ' projects');
    empty.hidden = n > 0;
  }
  q.addEventListener('input', filter);
  filter();

  const t = $('gen');
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
