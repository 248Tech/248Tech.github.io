// Builds projects.json: every public, non-fork, non-archived repo of OWNER that has a live
// GitHub Pages site (detected by probing https://OWNER.github.io/<repo>/ - no admin token needed).
// Usage: node scripts/build.mjs   (set GITHUB_TOKEN to avoid API rate limits)
import { writeFile } from 'node:fs/promises';
import { countAll } from './loc.mjs';

const OWNER = process.env.OWNER || '248Tech';
const HOST = `https://${OWNER.toLowerCase()}.github.io`;
const headers = { 'User-Agent': 'pages-directory', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function listRepos() {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`https://api.github.com/users/${OWNER}/repos?type=owner&per_page=100&page=${page}`, { headers });
    if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

async function live(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return r.ok;
  } catch { return false; }
}

// Commercial products with private source. Each is listed through its public site/demo repo
// (keyed by that repo's name) and gets no "Source" link, since the site repo is not the product's code.
const COMMERCIAL = {
  'rentalos-site': {
    title: 'RentalOS',
    banner: 'rentalos',
    demo: 'demo/',
    language: 'JavaScript',
    topics: ['event-rental', 'self-hosted', 'inventory-management'],
    description: 'Self-hosted event rental software: inventory, quotes, availability conflict detection, pull sheets, e-signatures and a public SEO catalog. Commercial product; try the in-browser demo.',
  },
};

// Open source = GitHub detected a real SPDX license (e.g. MIT). Repos with no license file or a
// custom/proprietary one (spdx_id NOASSERTION) are public but not open source.
const isOpenSource = r => !!r.license?.spdx_id && !['NOASSERTION', 'NONE'].includes(r.license.spdx_id);

const repos = (await listRepos()).filter(r => !r.fork && !r.archived && !r.private && r.name.toLowerCase() !== `${OWNER.toLowerCase()}.github.io`);
const checked = await Promise.all(repos.map(async r => {
  const site = `${HOST}/${r.name}/`;
  const c = COMMERCIAL[r.name];
  return (await live(site)) ? {
    name: r.name,
    ...(c && { title: c.title, banner: c.banner, commercial: true }),
    description: c?.description || r.description || '',
    site,
    demo: c?.demo ? site + c.demo : site,
    repo: c ? null : r.html_url,
    open: !c && isOpenSource(r),
    license: r.license?.spdx_id || null,
    language: c?.language || r.language || '',
    topics: c?.topics || r.topics || [],
    stars: r.stargazers_count,
    pushed: r.pushed_at,
  } : null;
}));
const projects = checked.filter(Boolean).sort((a, b) => b.stars - a.stars || b.pushed.localeCompare(a.pushed));
const loc = await countAll(repos.filter(isOpenSource));
console.log(`${loc.total} lines of open-source code across ${Object.keys(loc.repos).length} repos`);
await writeFile(new URL('../projects.json', import.meta.url), JSON.stringify({ owner: OWNER, generated: new Date().toISOString(), loc, projects }, null, 2) + '\n');
console.log(`${projects.length} sites:`, projects.map(p => p.name).join(', '));
