// Counts non-blank lines of hand-written source code across public, non-fork repos.
// Shallow-clones each repo (public, unauthenticated) into a temp dir and only reads files - nothing is executed.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, basename } from 'node:path';

const run = promisify(execFile);
const LANG = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.go': 'Go', '.py': 'Python', '.cs': 'C#', '.java': 'Java', '.kt': 'Kotlin', '.rs': 'Rust', '.c': 'C', '.h': 'C', '.cpp': 'C++', '.hpp': 'C++',
  '.html': 'HTML', '.css': 'CSS', '.scss': 'CSS', '.sql': 'SQL', '.prisma': 'Prisma', '.sh': 'Shell', '.ps1': 'PowerShell', '.bat': 'Shell',
  '.xaml': 'XAML', '.vue': 'Vue', '.svelte': 'Svelte', '.php': 'PHP', '.rb': 'Ruby', '.lua': 'Lua', '.swift': 'Swift', '.dart': 'Dart',
};
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', 'vendor', 'bin', 'obj', 'coverage', '__pycache__', '.venv', 'venv', 'target', 'packages', 'third_party', 'lib-vendor']);
const MAX_BYTES = 1_500_000; // skip giant generated/bundled files

async function walk(dir, tally) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) await walk(p, tally); continue; }
    if (!e.isFile()) continue;
    const lang = LANG[extname(e.name).toLowerCase()];
    if (!lang || /\.min\.|\.bundle\.|\.d\.ts$|\.generated\./.test(e.name)) continue;
    if ((await stat(p)).size > MAX_BYTES) continue;
    const text = await readFile(p, 'utf8');
    let n = 0; for (const line of text.split('\n')) if (line.trim()) n++;
    tally[lang] = (tally[lang] || 0) + n;
  }
}

export async function countRepo(cloneUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'loc-'));
  try {
    await run('git', ['clone', '--depth', '1', '--quiet', '--no-tags', cloneUrl, dir], { timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    const tally = {}; await walk(dir, tally);
    return tally;
  } catch (e) { console.warn('loc skip', basename(cloneUrl), e.message.split('\n')[0]); return null; }
  finally { await rm(dir, { recursive: true, force: true, maxRetries: 3 }); }
}

export async function countAll(repos, concurrency = 4) {
  const perRepo = {}, languages = {}; let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < repos.length) {
      const r = repos[i++]; const t = await countRepo(r.clone_url); if (!t) continue;
      const total = Object.values(t).reduce((a, b) => a + b, 0);
      if (total) perRepo[r.name] = { total, languages: t };
      for (const [l, n] of Object.entries(t)) languages[l] = (languages[l] || 0) + n;
    }
  }));
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  return { total, languages, repos: perRepo };
}
