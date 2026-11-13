// Builds projects.json: every public, non-fork, non-archived repo of OWNER that has a live
// GitHub Pages site (detected by probing https://OWNER.github.io/<repo>/ - no admin token needed).
// Usage: node scripts/build.mjs   (set GITHUB_TOKEN to avoid API rate limits)
import { writeFile } from 'node:fs/promises';

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

const repos = (await listRepos()).filter(r => !r.fork && !r.archived && !r.private && r.name.toLowerCase() !== `${OWNER.toLowerCase()}.github.io`);
const checked = await Promise.all(repos.map(async r => {
  const site = `${HOST}/${r.name}/`;
  return (await live(site)) ? {
    name: r.name,
    description: r.description || '',
    site,
    repo: r.html_url,
    language: r.language || '',
    topics: r.topics || [],
    stars: r.stargazers_count,
    pushed: r.pushed_at,
  } : null;
}));
const projects = checked.filter(Boolean).sort((a, b) => b.stars - a.stars || b.pushed.localeCompare(a.pushed));
await writeFile(new URL('../projects.json', import.meta.url), JSON.stringify({ owner: OWNER, generated: new Date().toISOString(), projects }, null, 2) + '\n');
console.log(`${projects.length} sites:`, projects.map(p => p.name).join(', '));
