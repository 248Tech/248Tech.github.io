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
  'RentalOS-Showcase': {
    title: 'RentalOS',
    banner: 'rentalos',
    demo: 'demo/',
    language: 'JavaScript',
    topics: ['event-rental', 'self-hosted', 'inventory-management'],
    description: 'Self-hosted event rental management: inventory availability that separates confirmed bookings from pending quotes, quoting with a click-to-sign audit trail, pull sheets, a public SEO catalog and an optional AI assistant. Commercial; source private. Browser demo uses sample data.',
  },
};

// Open source = GitHub detected a real SPDX license (e.g. MIT). Repos with no license file or a
// custom/proprietary one (spdx_id NOASSERTION) are public but not open source.
const isOpenSource = r => !!r.license?.spdx_id && !['NOASSERTION', 'NONE'].includes(r.license.spdx_id);

// Latest published release (GitHub's /releases/latest skips drafts and pre-releases).
// Picks the best downloadable asset: installer/executable, then OS package, then archive; never
// checksums or signatures. Open-source releases without assets fall back to the tag's source zip.
// Proprietary/commercial projects without assets get no download (e.g. GarageIQ's license forbids installs).
const SKIP_ASSET = /(\.sha(1|256|512)|sha\d*sums?[^/]*|checksums?[^/]*|\.sig|\.asc|\.pem|\.txt|\.json|\.ya?ml)$/i;
const ASSET_RANK = [/\.(exe|msi|msix)$/i, /\.(dmg|pkg|appimage|deb|rpm)$/i, /\.(zip|7z|tar\.gz|tgz|tar\.xz)$/i];
async function latestDownload(r, open) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${r.name}/releases/latest`, { headers });
  if (res.status === 404) return null; // no published release
  if (!res.ok) { console.warn('release lookup failed', r.name, res.status); return null; }
  const rel = await res.json();
  const assets = (rel.assets || []).filter(a => a.state === 'uploaded' && !SKIP_ASSET.test(a.name));
  const asset = ASSET_RANK.map(re => assets.find(a => re.test(a.name))).find(Boolean) || assets[0];
  if (asset) return { url: asset.browser_download_url, file: asset.name, size: asset.size, version: rel.tag_name, kind: 'binary' };
  if (open) return { url: `https://github.com/${OWNER}/${r.name}/archive/refs/tags/${encodeURIComponent(rel.tag_name)}.zip`, file: `${r.name}-${rel.tag_name}.zip`, size: null, version: rel.tag_name, kind: 'source' };
  return null;
}

// Pages sites that are part of this portfolio, not projects (e.g. the contact form).
const EXCLUDE = new Set(['project-inquiry']);
const repos = (await listRepos()).filter(r => !r.fork && !r.archived && !r.private && !EXCLUDE.has(r.name) && r.name.toLowerCase() !== `${OWNER.toLowerCase()}.github.io`);
const checked = await Promise.all(repos.map(async r => {
  const site = `${HOST}/${r.name}/`;
  const c = COMMERCIAL[r.name];
  if (!(await live(site))) return null;
  const open = !c && isOpenSource(r);
  return {
    name: r.name,
    ...(c && { title: c.title, banner: c.banner, commercial: true }),
    description: c?.description || r.description || '',
    site,
    demo: c?.demo ? site + c.demo : site,
    repo: c ? null : r.html_url,
    open,
    license: r.license?.spdx_id || null,
    download: c ? null : await latestDownload(r, open),
    language: c?.language || r.language || '',
    topics: c?.topics || r.topics || [],
    stars: r.stargazers_count,
    pushed: r.pushed_at,
  };
}));
const projects = checked.filter(Boolean).sort((a, b) => b.stars - a.stars || b.pushed.localeCompare(a.pushed));
const loc = await countAll(repos.filter(isOpenSource));
console.log(`${loc.total} lines of open-source code across ${Object.keys(loc.repos).length} repos`);
await writeFile(new URL('../projects.json', import.meta.url), JSON.stringify({ owner: OWNER, generated: new Date().toISOString(), loc, projects }, null, 2) + '\n');
console.log(`${projects.length} sites:`, projects.map(p => p.name).join(', '));
