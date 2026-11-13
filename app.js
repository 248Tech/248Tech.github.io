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
})();
